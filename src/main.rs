#[macro_use]
extern crate log;
#[macro_use]
extern crate serde_derive;

mod database;
mod handlers;
mod options;
mod server;

use crate::options::Options;
use structopt::StructOpt;

fn main() {
    env_logger::init();

    let options = Options::from_args();

    server::start(&options);
}
