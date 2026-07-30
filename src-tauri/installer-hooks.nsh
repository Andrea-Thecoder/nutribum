!macro NSIS_HOOK_POSTUNINSTALL
  MessageBox MB_YESNO|MB_ICONQUESTION "Vuoi eliminare anche tutti i tuoi dati di NutriBum (diario alimentare, peso, impostazioni)?$\n$\nQuesta azione non può essere annullata." IDYES nutribum_elimina_dati IDNO nutribum_mantieni_dati

  nutribum_elimina_dati:
    RMDir /r "$APPDATA\it.nutrition.nutribum"
    RMDir /r "$LOCALAPPDATA\it.nutrition.nutribum"
    Goto nutribum_fine

  nutribum_mantieni_dati:

  nutribum_fine:
!macroend
