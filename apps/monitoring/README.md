# 🦀 Craby Monitor

A lightweight Linux system monitoring dashboard written in Go. No external dependencies — uses only the standard library.

## Features

- **Web dashboard** — auto-refreshes every 5 seconds
- **JSON API** — machine-readable system metrics
- **Basic Auth** — password-protected access
- **Metrics collected:**
  - CPU count, OS/arch, Go version, uptime
  - Load average (1m / 5m / 15m)
  - Memory usage with visual progress bar
  - Disk usage (`/`) with visual progress bar
  - Network RX/TX per interface
  - Top 10 processes by CPU usage

## Requirements

- Go 1.22+
- Linux (relies on `/proc/net/dev`, `/proc/loadavg`, `free`, `df`, `ps`, `uptime`)

## Usage

```bash
go run main.go
```

The server starts on port **10000**.

| Endpoint | Description |
|----------|-------------|
| `http://<host>:10000/` | HTML dashboard |
| `http://<host>:10000/api` | JSON API |

Both endpoints require HTTP Basic Auth.

## Configuration

Credentials and port are defined as constants in `main.go`:

```go
const (
    authUser = "craby"
    authPass = "nasir10000"
)
```

Change these before deploying to a public-facing server.

## Build

```bash
go build -o craby-monitor main.go
./craby-monitor
```

## Running as a service (systemd)

```ini
[Unit]
Description=Craby Monitor
After=network.target

[Service]
ExecStart=/usr/local/bin/craby-monitor
Restart=always
User=nobody

[Install]
WantedBy=multi-user.target
```

```bash
sudo cp craby-monitor /usr/local/bin/
sudo systemctl enable --now craby-monitor
```
