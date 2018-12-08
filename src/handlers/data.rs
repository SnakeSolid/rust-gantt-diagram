use super::util;
use super::HandlerError;
use crate::database::PostgreSQL;
use iron::middleware::Handler;
use iron::IronResult;
use iron::Request as IronRequest;
use iron::Response as IronResponse;

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
                        let name: String = name
                            .chars()
                            .filter(|&ch| !ch.is_control() && ch != ';')
                            .collect();
                        let start_date: i64 = SECOND_MULTIPLIER * start_date.sec
                            + start_date.nsec as i64 / NANOSECOND_DIVIDER;
                        let end_date: i64 = SECOND_MULTIPLIER * end_date.sec
                            + end_date.nsec as i64 / NANOSECOND_DIVIDER;

                        result.push_str(&format!(
                            "{};{};{};{};{}\n",
                            name, start_date, end_date, group, thread
                        ))
                    },
                )
                .map_err(|e| HandlerError::new(&e.to_string()))?;

            Ok(result)
        })
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
