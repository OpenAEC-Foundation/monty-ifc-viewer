#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let mut context = tauri::generate_context!();
    context.set_default_window_icon(Some(
        tauri::image::Image::from_bytes(include_bytes!("../icons/128x128.png"))
            .expect("failed to load window icon"),
    ));

    tauri::Builder::default()
        .run(context)
        .expect("error while running tauri application");
}
