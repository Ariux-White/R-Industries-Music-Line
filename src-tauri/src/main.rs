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
// FIX: Renamed variables to simple words to bypass Tauri's strict casing rules
fn update_discord_status(state: State<AppState>, song: String, artist: String, thumbnail: String, start: i64, end: i64) {
    println!("DEBUG: Received {} by {} | Image: {}", song, artist, thumbnail);
    let mut drpc_guard = state.drpc.lock().unwrap();
    
    // 1. If client is missing, start it
    if drpc_guard.is_none() {
        let mut client = DiscordClient::new(1479476213637709845);
        client.start();
        
        thread::sleep(Duration::from_millis(1000)); 
        
        *drpc_guard = Some(client);
        println!("DEBUG: Discord Presence Initialized.");
    }
    
    // 2. Try to update status
    if let Some(client) = drpc_guard.as_mut() {
        let large_img = if thumbnail.starts_with("http") { thumbnail.clone() } else { "r-logo".to_string() };

        let res = client.set_activity(|act| {
            act.state(artist)
               .details(song.clone())
               .assets(|a| {
                   a.large_image(large_img.as_str())
                    .large_text(song.as_str())
                    .small_image("r-logo")
                    .small_text("R Industries Music Line")
               })
               // Passes the clean start and end variables
               .timestamps(|t| t.start(start as u64).end(end as u64))
        });
        
        match res {
            Ok(_) => println!("DEBUG: Discord Update Successful!"),
            Err(e) => {
                println!("DEBUG: Discord Update Failed: {:?}. Retrying in 2s...", e);
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