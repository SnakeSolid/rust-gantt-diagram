use crate::handlers::DataHandler;
use crate::handlers::DatabasesHandler;
use crate::handlers::StagesHandler;
use crate::options::Options;
use iron::Iron;
use mount::Mount;
use staticfile::Static;

pub fn start(options: &Options) -> () {
    let mut mount = Mount::new();
    mount.mount("/api/v1/databases", DatabasesHandler::new());
    mount.mount("/api/v1/stages", StagesHandler::new());
    mount.mount("/api/v1/data", DataHandler::new());
    mount.mount("/static", Static::new("public/static"));
    mount.mount("/", Static::new("public"));

    let address = options.address();
    let port = options.port();

    println!("Listening on {}:{}...", address, port);

    match Iron::new(mount).http((address, port)) {
        Ok(_) => {}
        Err(err) => error!("Failed to start HTTP server: {}", err),
    }
}
