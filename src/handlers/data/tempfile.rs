use std::fmt::Arguments;
use std::fs;
use std::fs::File;
use std::fs::OpenOptions;
use std::io::Read;
use std::io::Result as IoResult;
use std::io::Seek;
use std::io::SeekFrom;
use std::io::Write;
use std::path::Path;
use std::path::PathBuf;

#[derive(Debug)]
pub struct TemporaryFile {
    path: PathBuf,
    file: Option<File>,
}

impl TemporaryFile {
    pub fn new<P>(path: &P) -> IoResult<TemporaryFile>
    where
        P: AsRef<Path>,
    {
        let path = path.as_ref();
        let file = OpenOptions::new()
            .read(true)
            .write(true)
            .truncate(true)
            .create(true)
            .open(&path)?;

        Ok(TemporaryFile {
            path: path.to_path_buf(),
            file: Some(file),
        })
    }

    pub fn seek_from_start(&mut self, position: u64) -> IoResult<u64> {
        if let Some(file) = &mut self.file {
            file.seek(SeekFrom::Start(position))
        } else {
            unreachable!("Try to seek dropped file {}", self.path.display());
        }
    }
}

impl Write for TemporaryFile {
    fn write(&mut self, buf: &[u8]) -> IoResult<usize> {
        if let Some(file) = &mut self.file {
            file.write(buf)
        } else {
            unreachable!("Try to write dropped file {}", self.path.display());
        }
    }

    fn flush(&mut self) -> IoResult<()> {
        if let Some(file) = &mut self.file {
            file.flush()
        } else {
            unreachable!("Try to write dropped file {}", self.path.display());
        }
    }

    fn write_all(&mut self, buf: &[u8]) -> IoResult<()> {
        if let Some(file) = &mut self.file {
            file.write_all(buf)
        } else {
            unreachable!("Try to write dropped file {}", self.path.display());
        }
    }

    fn write_fmt(&mut self, fmt: Arguments) -> IoResult<()> {
        if let Some(file) = &mut self.file {
            file.write_fmt(fmt)
        } else {
            unreachable!("Try to write dropped file {}", self.path.display());
        }
    }
}

impl Read for TemporaryFile {
    fn read(&mut self, buf: &mut [u8]) -> IoResult<usize> {
        if let Some(file) = &mut self.file {
            file.read(buf)
        } else {
            unreachable!("Try to read dropped file {}", self.path.display());
        }
    }

    fn read_to_end(&mut self, buf: &mut Vec<u8>) -> IoResult<usize> {
        if let Some(file) = &mut self.file {
            file.read_to_end(buf)
        } else {
            unreachable!("Try to read dropped file {}", self.path.display());
        }
    }

    fn read_to_string(&mut self, buf: &mut String) -> IoResult<usize> {
        if let Some(file) = &mut self.file {
            file.read_to_string(buf)
        } else {
            unreachable!("Try to read dropped file {}", self.path.display());
        }
    }

    fn read_exact(&mut self, buf: &mut [u8]) -> IoResult<()> {
        if let Some(file) = &mut self.file {
            file.read_exact(buf)
        } else {
            unreachable!("Try to read dropped file {}", self.path.display());
        }
    }
}

impl Drop for TemporaryFile {
    fn drop(&mut self) {
        if let Some(_file) = &self.file {
            self.file = None;

            match fs::remove_file(&self.path) {
                Ok(()) => {}
                Err(err) => warn!(
                    "Failed to remove temporary file {}: {}",
                    self.path.display(),
                    err
                ),
            }
        }
    }
}
