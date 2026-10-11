use std::collections::HashMap;
use std::sync::{Arc, Mutex};
use tauri::{Emitter, Manager, State};
use tauri_plugin_shell::ShellExt;
use tauri_plugin_shell::process::{CommandChild, CommandEvent};

#[derive(Default)]
struct FfmpegProcesses {
    processes: HashMap<String, Arc<Mutex<Option<CommandChild>>>>,
}

#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}

#[tauri::command]
async fn run_ffmpeg(
    app: tauri::AppHandle,
    process_id: String,
    args: Vec<String>,
    state: State<'_, Mutex<FfmpegProcesses>>,
) -> Result<(), String> {
    let (mut rx, child) = app
        .shell()
        .sidecar("ffmpeg")
        .map_err(|e| e.to_string())?
        .args(&args)
        .spawn()
        .map_err(|e| e.to_string())?;

    // Store the child process for cancellation
    let child_handle = Arc::new(Mutex::new(Some(child)));
    state
        .lock()
        .unwrap()
        .processes
        .insert(process_id.clone(), child_handle);

    let process_id_clone = process_id.clone();
    // Listen to command events
    while let Some(event) = rx.recv().await {
        match event {
            CommandEvent::Stdout(line_bytes) => {
                let line = String::from_utf8_lossy(&line_bytes);
                let _ = app.emit(
                    "ffmpeg-output",
                    FfmpegOutput {
                        process_id: process_id_clone.clone(),
                        line: line.to_string(),
                    },
                );
            }
            CommandEvent::Stderr(line_bytes) => {
                let line = String::from_utf8_lossy(&line_bytes);
                if line.contains("time=") || line.contains("frame=") {
                    let _ = app.emit(
                        "ffmpeg-progress",
                        FfmpegProgress {
                            process_id: process_id_clone.clone(),
                            line: line.to_string(),
                            pass: None,
                        },
                    );
                }
            }
            CommandEvent::Error(error) => {
                let _ = app.emit(
                    "ffmpeg-error",
                    FfmpegError {
                        process_id: process_id_clone.clone(),
                        error: error.clone(),
                    },
                );
            }
            CommandEvent::Terminated(payload) => {
                let _ = app.emit(
                    "ffmpeg-complete",
                    FfmpegComplete {
                        process_id: process_id_clone.clone(),
                        success: payload.code == Some(0),
                        code: payload.code,
                    },
                );
                break;
            }
            _ => {}
        }
    }

    // Clean up
    state.lock().unwrap().processes.remove(&process_id_clone);

    Ok(())
}

#[tauri::command]
async fn run_ffmpeg_2pass(
    app: tauri::AppHandle,
    process_id: String,
    pass1_args: Vec<String>,
    pass2_args: Vec<String>,
    state: State<'_, Mutex<FfmpegProcesses>>,
) -> Result<(), String> {
    // Create a new child process storage
    let child_handle = Arc::new(Mutex::new(None));

    // Store the process handle
    println!("{:?}, {:?}", pass1_args, pass2_args);
    state
        .lock()
        .unwrap()
        .processes
        .insert(process_id.clone(), child_handle.clone());

    // Spawn both passes in a separate thread

    // PASS 1
    let _ = app.emit(
        "ffmpeg-pass-start",
        FfmpegPassStart {
            process_id: process_id.clone(),
            pass: 1,
        },
    );

    let (mut rx1, child1) = match app
        .shell()
        .sidecar("ffmpeg")
        .expect("failed to create ffmpeg sidecar")
        .args(&pass1_args)
        .spawn()
    {
        Ok(result) => result,
        Err(e) => {
            let _ = app.emit(
                "ffmpeg-error",
                FfmpegError {
                    process_id: process_id.clone(),
                    error: format!("Failed to spawn pass 1: {}", e),
                },
            );
            return Ok(());
        }
    };

    // Store the child process
    {
        let mut handle = child_handle.lock().unwrap();
        *handle = Some(child1);
    }

    let mut pass1_success = false;

    // Listen to pass 1 events
    while let Some(event) = rx1.recv().await {
        match event {
            CommandEvent::Stdout(line_bytes) => {
                let line = String::from_utf8_lossy(&line_bytes);
                println!("{}", line);
                let _ = app.emit(
                    "ffmpeg-output",
                    FfmpegOutput {
                        process_id: process_id.clone(),
                        line: line.to_string(),
                    },
                );
            }
            CommandEvent::Stderr(line_bytes) => {
                let line = String::from_utf8_lossy(&line_bytes);
                println!("{}", line);
                if line.contains("time=") || line.contains("frame=") {
                    let _ = app.emit(
                        "ffmpeg-progress",
                        FfmpegProgress {
                            process_id: process_id.clone(),
                            line: line.to_string(),
                            pass: Some(1),
                        },
                    );
                }
            }
            CommandEvent::Error(error) => {
                println!("{}", error);
                let _ = app.emit(
                    "ffmpeg-error",
                    FfmpegError {
                        process_id: process_id.clone(),
                        error: format!("Pass 1 error: {}", error),
                    },
                );
            }
            CommandEvent::Terminated(payload) => {
                pass1_success = payload.code == Some(0);
                let _ = app.emit(
                    "ffmpeg-pass-complete",
                    FfmpegPassComplete {
                        process_id: process_id.clone(),
                        pass: 1,
                        success: pass1_success,
                    },
                );
                break;
            }
            _ => {}
        }
    }

    // Check if we should proceed to pass 2
    if !pass1_success {
        let _ = app.emit(
            "ffmpeg-complete",
            FfmpegComplete {
                process_id: process_id.clone(),
                success: false,
                code: Some(1),
            },
        );

        state.lock().unwrap().processes.remove(&process_id);
        return Ok(());
    }

    // PASS 2
    let _ = app.emit(
        "ffmpeg-pass-start",
        FfmpegPassStart {
            process_id: process_id.clone(),
            pass: 2,
        },
    );

    let (mut rx2, child2) = match app
        .shell()
        .sidecar("ffmpeg")
        .expect("failed to create ffmpeg sidecar")
        .args(&pass2_args)
        .spawn()
    {
        Ok(result) => result,
        Err(e) => {
            let _ = app.emit(
                "ffmpeg-error",
                FfmpegError {
                    process_id: process_id.clone(),
                    error: format!("Failed to spawn pass 2: {}", e),
                },
            );
            return Ok(());
        }
    };

    // Update stored child process
    {
        let mut handle = child_handle.lock().unwrap();
        *handle = Some(child2);
    }

    let mut pass2_success = false;

    // Listen to pass 2 events
    while let Some(event) = rx2.recv().await {
        match event {
            CommandEvent::Stdout(line_bytes) => {
                let line = String::from_utf8_lossy(&line_bytes);
                println!("{}", line);
                let _ = app.emit(
                    "ffmpeg-output",
                    FfmpegOutput {
                        process_id: process_id.clone(),
                        line: line.to_string(),
                    },
                );
            }
            CommandEvent::Stderr(line_bytes) => {
                let line = String::from_utf8_lossy(&line_bytes);
                println!("{}", line);
                if line.contains("time=") || line.contains("frame=") {
                    let _ = app.emit(
                        "ffmpeg-progress",
                        FfmpegProgress {
                            process_id: process_id.clone(),
                            line: line.to_string(),
                            pass: Some(2),
                        },
                    );
                }
            }
            CommandEvent::Error(error) => {
                println!("{}", error);
                let _ = app.emit(
                    "ffmpeg-error",
                    FfmpegError {
                        process_id: process_id.clone(),
                        error: format!("Pass 2 error: {}", error),
                    },
                );
            }
            CommandEvent::Terminated(payload) => {
                pass2_success = payload.code == Some(0);
                let _ = app.emit(
                    "ffmpeg-pass-complete",
                    FfmpegPassComplete {
                        process_id: process_id.clone(),
                        pass: 2,
                        success: pass2_success,
                    },
                );
                break;
            }
            _ => {}
        }
    }

    // Final completion
    let _ = app.emit(
        "ffmpeg-complete",
        FfmpegComplete {
            process_id: process_id.clone(),
            success: pass2_success,
            code: if pass2_success { Some(0) } else { Some(1) },
        },
    );

    // Clean up
    state.lock().unwrap().processes.remove(&process_id);

    Ok(())
}

#[tauri::command]
fn cancel_ffmpeg(
    process_id: String,
    state: State<'_, Mutex<FfmpegProcesses>>,
) -> Result<(), String> {
    let child_handle = {
        let processes = &state.lock().unwrap().processes;
        processes.get(&process_id).cloned()
    };

    if let Some(child_handle) = child_handle {
        {
            let mut child = child_handle.lock().unwrap();
            if let Some(process) = child.take() {
                process.kill().map_err(|e| e.to_string())?;
            }
        }

        // Now remove from the map
        state.lock().unwrap().processes.remove(&process_id);
        Ok(())
    } else {
        Err("Process not found".to_string())
    }
}

#[derive(Clone, serde::Serialize)]
struct FfmpegProgress {
    process_id: String,
    line: String,
    pass: Option<i32>,
}

#[derive(Clone, serde::Serialize)]
struct FfmpegOutput {
    process_id: String,
    line: String,
}

#[derive(Clone, serde::Serialize)]
struct FfmpegComplete {
    process_id: String,
    success: bool,
    code: Option<i32>,
}

#[derive(Clone, serde::Serialize)]
struct FfmpegError {
    process_id: String,
    error: String,
}

#[derive(Clone, serde::Serialize)]
struct FfmpegPassStart {
    process_id: String,
    pass: i32,
}

#[derive(Clone, serde::Serialize)]
struct FfmpegPassComplete {
    process_id: String,
    pass: i32,
    success: bool,
}

#[tauri::command]
async fn copy_file_to_clipboard(file_path: String) -> Result<(), String> {
    #[cfg(target_os = "windows")]
    {
        use std::{os::windows::process::CommandExt, process::Command};

        let ps_script = format!(r#"Set-Clipboard -Path '{}'"#, file_path.replace("'", "''"));

        let output = Command::new("powershell")
            .args(&["-Command", &ps_script])
            .creation_flags(0x08000000)
            .output()
            .map_err(|e| format!("Failed to run PowerShell: {}", e))?;

        if !output.status.success() {
            let error = String::from_utf8_lossy(&output.stderr);
            return Err(format!("PowerShell command failed: {}", error));
        }
    }
    Ok(())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_clipboard_manager::init())
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_opener::init())
        .setup(|app| {
            app.manage(Mutex::new(FfmpegProcesses::default()));
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            greet,
            cancel_ffmpeg,
            run_ffmpeg_2pass,
            run_ffmpeg,
            copy_file_to_clipboard
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
