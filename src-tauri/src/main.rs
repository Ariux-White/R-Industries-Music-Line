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
fn update_discord_status(state: State<AppState>, song: String, artist: String) {
    println!("DEBUG: Received {} by {}", song, artist);
    let mut drpc_guard = state.drpc.lock().unwrap();
    
    // 1. If client is missing, start it
    if drpc_guard.is_none() {
        let mut client = DiscordClient::new(1479476213637709845);
        client.start();
        
        // CRITICAL FIX: Give Discord 1 second to connect
        thread::sleep(Duration::from_millis(1000)); 
        
        *drpc_guard = Some(client);
        println!("DEBUG: Discord Presence Initialized.");
    }
    
    // 2. Try to update status
    if let Some(client) = drpc_guard.as_mut() {
        let res = client.set_activity(|act| {
            act.state(artist)
               .details(song)
               .assets(|a| a.large_image("r-logo").large_text("R Industries Music Line"))
        });
        
        match res {
            Ok(_) => println!("DEBUG: Discord Update Successful!"),
            // 3. If it fails with "Not Started", it needs a bit more time
            Err(e) => {
                println!("DEBUG: Discord Update Failed: {:?}. Retrying in 2s...", e);
                // Background thread so the app doesn't freeze
                thread::sleep(Duration::from_millis(2000));
            }
        }
    }
}

fn main() {
    tauri::Builder::default()
        .manage(AppState {
            drpc: Mutex::new(None),
        })
        .invoke_handler(tauri::generate_handler![update_discord_status])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}