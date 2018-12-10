mod tempfile;

use self::tempfile::TemporaryFile;
use super::util;
use super::HandlerError;
use crate::database::PostgreSQL;
use iron::middleware::Handler;
use iron::response::BodyReader;
use iron::IronResult;
use iron::Request as IronRequest;
use iron::Response as IronResponse;
use std::io::BufWriter;
use std::io::Result as IoResult;
use std::io::Write;
use std::path::PathBuf;
use std::sync::atomic::AtomicUsize;
use std::sync::atomic::Ordering;
use time::Timespec;

#[derive(Debug)]
pub struct DataHandler {
    temp_dir: PathBuf,
    request_index: AtomicUsize,
}

impl DataHandler {
    pub fn new() -> DataHandler {
        DataHandler {
            temp_dir: ".".into(),
            request_index: AtomicUsize::new(0),
        }
    }

    fn next_temporary_path(&self) -> PathBuf {
        let index = self.request_index.fetch_add(1, Ordering::SeqCst);
        let file_name = format!("response-{:?}.tmp", index);

        self.temp_dir.join(file_name)
    }
}

const SECOND_MULTIPLIER: i64 = 1_000;
const NANOSECOND_DIVIDER: i64 = 1_000_000;

impl Handler for DataHandler {
    fn handle(&self, request: &mut IronRequest) -> IronResult<IronResponse> {
        util::handle_read(request, move |request: Request| {
            let postgres = PostgreSQL::new(
                &request.server,
                request.port,
                &request.user,
                &request.password,
            );
            let path = self.next_temporary_path();
            let file = TemporaryFile::new(&path).map_err(|e| HandlerError::new(&e.to_string()))?;
            let mut writer = BufWriter::new(file);;

            postgres
                .data(
                    &request.database,
                    &request.stage,
                    |name, start_date, end_date, group, thread| {
                        write_dlm_string(&mut writer, name, start_date, end_date, group, thread)
                    },
                )
                .map_err(|e| HandlerError::new(&e.to_string()))?
                .map_err(|e| HandlerError::new(&e.to_string()))?;

            let mut file = writer
                .into_inner()
                .map_err(|e| HandlerError::new(&e.to_string()))?;

            file.seek_from_start(0)
                .map_err(|e| HandlerError::new(&e.to_string()))?;

            Ok(BodyReader(file))
        })
    }
}

fn write_dlm_string(
    writer: &mut Write,
    name: &str,
    start_date: Timespec,
    end_date: Timespec,
    group: &str,
    thread: &str,
) -> IoResult<()> {
    let name: String = name
        .chars()
        .filter(|&ch| !ch.is_control() && ch != ';')
        .collect();
    let start_date: i64 =
        SECOND_MULTIPLIER * start_date.sec + start_date.nsec as i64 / NANOSECOND_DIVIDER;
    let end_date: i64 =
        SECOND_MULTIPLIER * end_date.sec + end_date.nsec as i64 / NANOSECOND_DIVIDER;

    if start_date < end_date {
        writer.write_fmt(format_args!(
            "{};{};{};{};{}\n",
            name, start_date, end_date, group, thread
        ))
    } else {
        // If start time greater then end time assume that end time invalid.
        writer.write_fmt(format_args!(
            "{};{};{};{};{}\n",
            name,
            start_date,
            start_date + 1,
            group,
            thread
        ))
    }
}

#[derive(Debug, Deserialize)]
struct Request {
    server: String,
    port: u16,
    user: String,
    password: String,
    database: String,
    stage: String,
}
