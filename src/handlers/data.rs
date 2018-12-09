use super::util;
use super::HandlerError;
use crate::database::PostgreSQL;
use iron::middleware::Handler;
use iron::IronResult;
use iron::Request as IronRequest;
use iron::Response as IronResponse;
use time::Timespec;

#[derive(Debug)]
pub struct DataHandler {}

impl DataHandler {
    pub fn new() -> DataHandler {
        DataHandler {}
    }
}

const SECOND_MULTIPLIER: i64 = 1_000;
const NANOSECOND_DIVIDER: i64 = 1_000_000;

impl Handler for DataHandler {
    fn handle(&self, request: &mut IronRequest) -> IronResult<IronResponse> {
        util::handle_request(request, move |request: Request| {
            let postgres = PostgreSQL::new(
                &request.server,
                request.port,
                &request.user,
                &request.password,
            );
            let mut result = String::new();

            postgres
                .data(
                    &request.database,
                    &request.stage,
                    |name, start_date, end_date, group, thread| {
                        result.push_str(&to_dlm_string(name, start_date, end_date, group, thread))
                    },
                )
                .map_err(|e| HandlerError::new(&e.to_string()))?;

            Ok(result)
        })
    }
}

fn to_dlm_string(
    name: &str,
    start_date: Timespec,
    end_date: Timespec,
    group: &str,
    thread: &str,
) -> String {
    let name: String = name
        .chars()
        .filter(|&ch| !ch.is_control() && ch != ';')
        .collect();
    let start_date: i64 =
        SECOND_MULTIPLIER * start_date.sec + start_date.nsec as i64 / NANOSECOND_DIVIDER;
    let end_date: i64 =
        SECOND_MULTIPLIER * end_date.sec + end_date.nsec as i64 / NANOSECOND_DIVIDER;

    if start_date < end_date {
        format!(
            "{};{};{};{};{}\n",
            name, start_date, end_date, group, thread
        )
    } else {
        // If start time greater then end time assume that end time invalid.
        format!(
            "{};{};{};{};{}\n",
            name,
            start_date,
            start_date + 1,
            group,
            thread
        )
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
