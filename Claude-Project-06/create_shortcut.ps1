$WshShell = New-Object -ComObject WScript.Shell
$Shortcut = $WshShell.CreateShortcut("C:\Users\ericp\OneDrive\Desktop\RStudio.lnk")
$Shortcut.TargetPath = "C:\Program Files\RStudio\rstudio.exe"
$Shortcut.Save()
Write-Host "Desktop shortcut created"
