package main

import (
	"crypto/sha256"
	"crypto/subtle"
	"encoding/json"
	"fmt"
	"html/template"
	"log"
	"net/http"
	"os"
	"runtime"
	"sort"
	"strings"
	"time"

	"github.com/shirou/gopsutil/v3/disk"
	"github.com/shirou/gopsutil/v3/host"
	"github.com/shirou/gopsutil/v3/load"
	"github.com/shirou/gopsutil/v3/mem"
	gopsnet "github.com/shirou/gopsutil/v3/net"
	"github.com/shirou/gopsutil/v3/process"
)

const (
	authUser = "craby"
	authPass = "nasir10000"
)

type SystemInfo struct {
	Hostname    string    `json:"hostname"`
	OS          string    `json:"os"`
	Arch        string    `json:"arch"`
	GoVersion   string    `json:"go_version"`
	CPUs        int       `json:"cpus"`
	Uptime      string    `json:"uptime"`
	LoadAvg     string    `json:"load_avg"`
	MemTotal    string    `json:"mem_total"`
	MemUsed     string    `json:"mem_used"`
	MemFree     string    `json:"mem_free"`
	MemPercent  string    `json:"mem_percent"`
	DiskTotal   string    `json:"disk_total"`
	DiskUsed    string    `json:"disk_used"`
	DiskFree    string    `json:"disk_free"`
	DiskPercent string    `json:"disk_percent"`
	Processes   []Process `json:"top_processes"`
	Timestamp   string    `json:"timestamp"`
	Networks    []NetInfo `json:"networks"`
}

type Process struct {
	PID     string `json:"pid"`
	User    string `json:"user"`
	CPU     string `json:"cpu"`
	Mem     string `json:"mem"`
	Command string `json:"command"`
}

type NetInfo struct {
	Interface string `json:"interface"`
	RxBytes   string `json:"rx_bytes"`
	TxBytes   string `json:"tx_bytes"`
}

func diskPath() string {
	if runtime.GOOS == "windows" {
		return "C:\\"
	}
	return "/"
}

func formatUptime(seconds uint64) string {
	days := seconds / 86400
	seconds %= 86400
	hours := seconds / 3600
	seconds %= 3600
	minutes := seconds / 60
	return fmt.Sprintf("up %d days, %d hours, %d minutes", days, hours, minutes)
}

func humanBytes(val uint64) string {
	units := []string{"B", "KB", "MB", "GB", "TB"}
	f := float64(val)
	i := 0
	for f >= 1024 && i < len(units)-1 {
		f /= 1024
		i++
	}
	return fmt.Sprintf("%.1f %s", f, units[i])
}

func getSystemInfo() SystemInfo {
	hostname, _ := os.Hostname()

	// Memory
	memStat, _ := mem.VirtualMemory()
	memTotal := humanBytes(memStat.Total)
	memUsed := humanBytes(memStat.Used)
	memFree := humanBytes(memStat.Available)
	memPercent := fmt.Sprintf("%.1f", memStat.UsedPercent)

	// Disk
	diskStat, _ := disk.Usage(diskPath())
	diskTotal := humanBytes(diskStat.Total)
	diskUsed := humanBytes(diskStat.Used)
	diskFree := humanBytes(diskStat.Free)
	diskPercent := fmt.Sprintf("%.1f%%", diskStat.UsedPercent)

	// Uptime
	hostInfo, _ := host.Info()
	uptime := formatUptime(hostInfo.Uptime)

	// Load average (returns error on Windows — show N/A)
	loadAvg := "N/A"
	if avg, err := load.Avg(); err == nil {
		loadAvg = fmt.Sprintf("%.2f %.2f %.2f", avg.Load1, avg.Load5, avg.Load15)
	}

	// Processes — top 10 by CPU
	type procEntry struct {
		pid  int32
		cpu  float64
		mem  float32
		name string
		user string
	}
	pids, _ := process.Pids()
	var entries []procEntry
	for _, pid := range pids {
		p, err := process.NewProcess(pid)
		if err != nil {
			continue
		}
		cpuPct, err := p.CPUPercent()
		if err != nil {
			continue
		}
		memPct, err := p.MemoryPercent()
		if err != nil {
			continue
		}
		name, _ := p.Name()
		username, _ := p.Username()
		entries = append(entries, procEntry{pid: pid, cpu: cpuPct, mem: memPct, name: name, user: username})
	}
	sort.Slice(entries, func(i, j int) bool { return entries[i].cpu > entries[j].cpu })
	if len(entries) > 10 {
		entries = entries[:10]
	}
	var topProcs []Process
	for _, e := range entries {
		topProcs = append(topProcs, Process{
			PID:     fmt.Sprintf("%d", e.pid),
			User:    e.user,
			CPU:     fmt.Sprintf("%.1f%%", e.cpu),
			Mem:     fmt.Sprintf("%.1f%%", e.mem),
			Command: e.name,
		})
	}

	// Network — skip loopback
	counters, _ := gopsnet.IOCounters(true)
	var nets []NetInfo
	for _, c := range counters {
		lower := strings.ToLower(c.Name)
		if lower == "lo" || strings.HasPrefix(lower, "loopback") {
			continue
		}
		nets = append(nets, NetInfo{
			Interface: c.Name,
			RxBytes:   humanBytes(c.BytesRecv),
			TxBytes:   humanBytes(c.BytesSent),
		})
	}

	return SystemInfo{
		Hostname:    hostname,
		OS:          runtime.GOOS,
		Arch:        runtime.GOARCH,
		GoVersion:   runtime.Version(),
		CPUs:        runtime.NumCPU(),
		Uptime:      uptime,
		LoadAvg:     loadAvg,
		MemTotal:    memTotal,
		MemUsed:     memUsed,
		MemFree:     memFree,
		MemPercent:  memPercent,
		DiskTotal:   diskTotal,
		DiskUsed:    diskUsed,
		DiskFree:    diskFree,
		DiskPercent: diskPercent,
		Processes:   topProcs,
		Timestamp:   time.Now().Format("2006-01-02 15:04:05 MST"),
		Networks:    nets,
	}
}

func basicAuth(next http.HandlerFunc) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		user, pass, ok := r.BasicAuth()
		if !ok {
			w.Header().Set("WWW-Authenticate", `Basic realm="Craby Monitor"`)
			http.Error(w, "Unauthorized", http.StatusUnauthorized)
			return
		}
		userHash := sha256.Sum256([]byte(user))
		passHash := sha256.Sum256([]byte(pass))
		expectedUserHash := sha256.Sum256([]byte(authUser))
		expectedPassHash := sha256.Sum256([]byte(authPass))

		userMatch := subtle.ConstantTimeCompare(userHash[:], expectedUserHash[:]) == 1
		passMatch := subtle.ConstantTimeCompare(passHash[:], expectedPassHash[:]) == 1

		if !userMatch || !passMatch {
			w.Header().Set("WWW-Authenticate", `Basic realm="Craby Monitor"`)
			http.Error(w, "Unauthorized", http.StatusUnauthorized)
			return
		}
		next(w, r)
	}
}

func apiHandler(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	info := getSystemInfo()
	json.NewEncoder(w).Encode(info)
}

func dashboardHandler(w http.ResponseWriter, r *http.Request) {
	info := getSystemInfo()
	tmpl.Execute(w, info)
}

var tmpl = template.Must(template.New("dashboard").Parse(`<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>🦀 Craby Monitor — {{.Hostname}}</title>
<meta http-equiv="refresh" content="5">
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: 'Segoe UI', system-ui, sans-serif; background: #0f172a; color: #e2e8f0; padding: 20px; }
  h1 { font-size: 1.8rem; margin-bottom: 20px; color: #38bdf8; }
  h1 span { font-size: 2rem; }
  .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 16px; margin-bottom: 20px; }
  .card { background: #1e293b; border-radius: 12px; padding: 20px; border: 1px solid #334155; }
  .card h2 { font-size: 0.85rem; text-transform: uppercase; letter-spacing: 1px; color: #94a3b8; margin-bottom: 12px; }
  .stat { font-size: 2rem; font-weight: 700; color: #f1f5f9; }
  .stat-sub { font-size: 0.85rem; color: #64748b; margin-top: 4px; }
  .bar-bg { background: #334155; border-radius: 8px; height: 10px; margin-top: 10px; overflow: hidden; }
  .bar-fill { height: 100%; border-radius: 8px; transition: width 0.5s; }
  .bar-mem { background: linear-gradient(90deg, #22d3ee, #3b82f6); }
  .bar-disk { background: linear-gradient(90deg, #a78bfa, #ec4899); }
  table { width: 100%; border-collapse: collapse; font-size: 0.85rem; }
  th { text-align: left; color: #94a3b8; padding: 8px; border-bottom: 1px solid #334155; font-weight: 600; }
  td { padding: 8px; border-bottom: 1px solid #1e293b; color: #cbd5e1; }
  tr:hover td { background: #1e293b; }
  .footer { text-align: center; color: #475569; font-size: 0.75rem; margin-top: 20px; }
  .cmd { max-width: 300px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
</style>
</head>
<body>
<h1><span>🦀</span> Craby Monitor — {{.Hostname}}</h1>

<div class="grid">
  <div class="card">
    <h2>System</h2>
    <div class="stat">{{.CPUs}} CPUs</div>
    <div class="stat-sub">{{.OS}}/{{.Arch}} · {{.GoVersion}}</div>
    <div class="stat-sub">{{.Uptime}}</div>
  </div>
  <div class="card">
    <h2>Load Average</h2>
    <div class="stat">{{.LoadAvg}}</div>
    <div class="stat-sub">1 min · 5 min · 15 min</div>
  </div>
  <div class="card">
    <h2>Memory</h2>
    <div class="stat">{{.MemUsed}} / {{.MemTotal}}</div>
    <div class="stat-sub">{{.MemPercent}}% used · {{.MemFree}} free</div>
    <div class="bar-bg"><div class="bar-fill bar-mem" style="width:{{.MemPercent}}%"></div></div>
  </div>
  <div class="card">
    <h2>Disk /</h2>
    <div class="stat">{{.DiskUsed}} / {{.DiskTotal}}</div>
    <div class="stat-sub">{{.DiskPercent}} used · {{.DiskFree}} free</div>
    <div class="bar-bg"><div class="bar-fill bar-disk" style="width:{{.DiskPercent}}"></div></div>
  </div>
  {{range .Networks}}
  <div class="card">
    <h2>Network — {{.Interface}}</h2>
    <div class="stat-sub">↓ RX: {{.RxBytes}}</div>
    <div class="stat-sub">↑ TX: {{.TxBytes}}</div>
  </div>
  {{end}}
</div>

<div class="card">
  <h2>Top Processes by CPU</h2>
  <table>
    <tr><th>PID</th><th>User</th><th>CPU</th><th>Mem</th><th>Command</th></tr>
    {{range .Processes}}
    <tr><td>{{.PID}}</td><td>{{.User}}</td><td>{{.CPU}}</td><td>{{.Mem}}</td><td class="cmd">{{.Command}}</td></tr>
    {{end}}
  </table>
</div>

<div class="footer">Updated: {{.Timestamp}} · Auto-refresh every 5s</div>
</body>
</html>`))

func main() {
	port := "10000"
	http.HandleFunc("/", basicAuth(dashboardHandler))
	http.HandleFunc("/api", basicAuth(apiHandler))
	log.Printf("🦀 Craby Monitor running on :%s (auth enabled)", port)
	log.Fatal(http.ListenAndServe(":"+port, nil))
}
