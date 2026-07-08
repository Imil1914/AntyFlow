' Flow launcher: runs the built Electron app without a console window.
' Derives the project folder from this script's own location, so it works
' regardless of where the project lives (even with non-ASCII paths).
Set fso = CreateObject("Scripting.FileSystemObject")
projDir = fso.GetParentFolderName(WScript.ScriptFullName)
Set sh = CreateObject("WScript.Shell")
sh.CurrentDirectory = projDir
electronExe = projDir & "\node_modules\electron\dist\electron.exe"
sh.Run """" & electronExe & """ """ & projDir & """", 0, False
