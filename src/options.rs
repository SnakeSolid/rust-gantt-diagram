use structopt::StructOpt;

#[derive(StructOpt, Debug)]
#[structopt(name = "gantt-diagram")]
pub struct Options {
    #[structopt(
        short = "a",
        long = "address",
        name = "ADDR",
        help = "Listen on given address",
        default_value = "localhost"
    )]
    address: String,

    #[structopt(
        short = "p",
        long = "port",
        name = "PORT",
        help = "Listen on given port",
        default_value = "8080"
    )]
    port: u16,
}

impl Options {
    pub fn address(&self) -> &str {
        &self.address
    }

    pub fn port(&self) -> u16 {
        self.port
    }
}
