package logger

import (
	"encoding/json"
	"fmt"
	"log"
	"os"
	"strings"
	"time"
)

type Level int

const (
	DebugLevel Level = iota
	InfoLevel
	WarnLevel
	ErrorLevel
	FatalLevel
)

type Config struct {
	Level  string
	Format string // "json" or "text"
}

type Logger struct {
	level  Level
	format string
	logger *log.Logger
}

// New creates a new logger instance
func New(cfg Config) *Logger {
	level := parseLevel(cfg.Level)
	
	return &Logger{
		level:  level,
		format: cfg.Format,
		logger: log.New(os.Stdout, "", 0),
	}
}

func parseLevel(level string) Level {
	switch strings.ToLower(level) {
	case "debug":
		return DebugLevel
	case "info":
		return InfoLevel
	case "warn", "warning":
		return WarnLevel
	case "error":
		return ErrorLevel
	case "fatal":
		return FatalLevel
	default:
		return InfoLevel
	}
}

func (l *Logger) log(level Level, msg string, fields ...interface{}) {
	if level < l.level {
		return
	}

	entry := map[string]interface{}{
		"timestamp": time.Now().UTC().Format(time.RFC3339),
		"level":     levelString(level),
		"message":   msg,
	}

	// Add fields if provided
	if len(fields) > 0 && len(fields)%2 == 0 {
		for i := 0; i < len(fields); i += 2 {
			key, ok := fields[i].(string)
			if ok {
				entry[key] = fields[i+1]
			}
		}
	}

	if l.format == "json" {
		data, _ := json.Marshal(entry)
		l.logger.Println(string(data))
	} else {
		// Text format
		var sb strings.Builder
		sb.WriteString(fmt.Sprintf("[%s] %s: %s", 
			entry["timestamp"], 
			entry["level"], 
			entry["message"]))
		
		// Add fields
		for k, v := range entry {
			if k != "timestamp" && k != "level" && k != "message" {
				sb.WriteString(fmt.Sprintf(" %s=%v", k, v))
			}
		}
		l.logger.Println(sb.String())
	}
}

// Debug logs a debug message
func (l *Logger) Debug(msg string, fields ...interface{}) {
	l.log(DebugLevel, msg, fields...)
}

// Info logs an info message
func (l *Logger) Info(msg string, fields ...interface{}) {
	l.log(InfoLevel, msg, fields...)
}

// Warn logs a warning message
func (l *Logger) Warn(msg string, fields ...interface{}) {
	l.log(WarnLevel, msg, fields...)
}

// Error logs an error message
func (l *Logger) Error(msg string, fields ...interface{}) {
	l.log(ErrorLevel, msg, fields...)
}

// Fatal logs a fatal message and exits
func (l *Logger) Fatal(msg string, fields ...interface{}) {
	l.log(FatalLevel, msg, fields...)
	os.Exit(1)
}

func levelString(level Level) string {
	switch level {
	case DebugLevel:
		return "DEBUG"
	case InfoLevel:
		return "INFO"
	case WarnLevel:
		return "WARN"
	case ErrorLevel:
		return "ERROR"
	case FatalLevel:
		return "FATAL"
	default:
		return "UNKNOWN"
	}
}