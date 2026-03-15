// Prevents additional console window on Windows in release
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use discord_presence::Client as DiscordClient;
use std::sync::Mutex;
use std::thread;
use std::time::Duration;
use tauri::State;

pub struct AppState {
    pub drpc: Mutex<Option<DiscordClient>>,
}

#[tauri::command]
fn update_discord_status(
    state: State<AppState>, 
    song: String, 
    artist: String, 
    thumbnail: String, 
    start: i64, 
    end: Option<i64>
) {
    println!("DEBUG: Received {} by {} | Image: {}", song, artist, thumbnail);
    
    let mut drpc_guard = state.drpc.lock().unwrap();

    // 1. If client is missing, start it
    if drpc_guard.is_none() {
        let mut client = DiscordClient::new(1479476213637709845);
        client.start();
        
        // Brief sleep to let Discord socket initialize
        thread::sleep(Duration::from_millis(1000)); 
        
        *drpc_guard = Some(client);
        println!("DEBUG: Discord Presence Initialized.");
    }
    
    // 2. Update status
    if let Some(client) = drpc_guard.as_mut() {
        let large_img = if thumbnail.starts_with("http") { thumbnail.clone() } else { "r-logo".to_string() };

        let res = client.set_activity(|act| {
            act.state(&artist)
                .details(&song)
                .assets(|a| {
                    a.large_image(&large_img)
                     .large_text(&song)
                     .small_image("r-logo")
                     .small_text("R Industries Music Line")
                })
                .timestamps(|t| {
                    let mut ts = t.start(start as u64);
                    if let Some(end_val) = end {
                        ts = ts.end(end_val as u64);
                    }
                    ts
                })
        });
        
        match res {
            Ok(_) => println!("DEBUG: Discord Update Successful!"),
            Err(e) => println!("DEBUG: Discord Update Failed: {:?}.", e),
        }
    }
}

// NEW COMMAND: This clears the status when you pause the music
#[tauri::command]
fn clear_discord_status(state: State<AppState>) {
    let mut drpc_guard = state.drpc.lock().unwrap();
    if let Some(client) = drpc_guard.as_mut() {
        match client.clear_activity() {
            Ok(_) => println!("DEBUG: Discord Presence Cleared (Paused)."),
            Err(e) => println!("DEBUG: Failed to clear Discord: {:?}", e),
        }
    }
}

fn main() {
    tauri::Builder::default()
        .manage(AppState {
            drpc: Mutex::new(None),
        })
        // Register BOTH commands here
        .invoke_handler(tauri::generate_handler![update_discord_status, clear_discord_status])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}