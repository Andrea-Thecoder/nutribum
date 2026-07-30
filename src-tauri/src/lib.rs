use std::fs;
use std::io::Write;
use tauri::Manager;
use tauri_plugin_sql::{Migration, MigrationKind};

fn migrations() -> Vec<Migration> {
    vec![Migration {
        version: 1,
        description: "schema",
        sql: include_str!("../migrations/0001_schema.sql"),
        kind: MigrationKind::Up,
    }]
}

// Chiamato dal frontend quando i dati iniziali (storico, layout, catalogo) sono pronti:
// chiude la finestra di splash e mostra quella principale, fino a quel momento nascosta.
#[tauri::command]
fn app_pronta(app: tauri::AppHandle) {
    if let Some(splash) = app.get_webview_window("splashscreen") {
        let _ = splash.close();
    }
    if let Some(main) = app.get_webview_window("main") {
        let _ = main.show();
        let _ = main.set_focus();
    }
}

// Chiamato dal frontend dopo aver scritto il log di un errore bloccante (es. fallimento del
// caricamento del database): termina subito l'intero processo, non ha senso lasciare l'app aperta
// ma inutilizzabile in silenzio.
#[tauri::command]
fn chiudi_app_per_errore(app: tauri::AppHandle) {
    app.exit(1);
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(
            tauri_plugin_sql::Builder::default()
                .add_migrations("sqlite:nutrition.db", migrations())
                .build(),
        )
        .setup(|app| {
            // Rispecchia la convenzione di errorLog.ts (stessa cartella "logs", stesso formato riga):
            // un panic Rust non passa MAI per quel codice JS — la webview potrebbe non essersi
            // nemmeno avviata (es. un fallimento delle migration SQL, già successo una volta) —
            // quindi senza un hook qui sparisce nel nulla, visibile solo su stderr lanciando l'app
            // da terminale. Registrato qui in .setup(): copre tutto ciò che avviene dopo l'avvio dei
            // plugin (migrazioni comprese), non un eventuale crash precedente a questo punto.
            let cartella_dati = app.path().app_data_dir()?;
            std::panic::set_hook(Box::new(move |info| {
                let cartella_log = cartella_dati.join("logs");
                if fs::create_dir_all(&cartella_log).is_err() {
                    return;
                }
                let oggi = chrono::Utc::now().format("%Y-%m-%d");
                let percorso = cartella_log.join(format!("{oggi}-error-log-critical.txt"));
                let riga = format!("{} : panic Rust : {}\n", chrono::Utc::now().to_rfc3339(), info);
                if let Ok(mut file) = fs::OpenOptions::new().create(true).append(true).open(&percorso) {
                    let _ = file.write_all(riga.as_bytes());
                }
            }));

            let window = app.get_webview_window("main").unwrap();
            window.set_icon(tauri::include_image!("icons/icon.png"))?;
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![app_pronta, chiudi_app_per_errore])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
