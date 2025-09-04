export default function Home() {
  return (
    <div style={{ padding: '2rem', fontFamily: 'system-ui' }}>
      <h1>NFL Fantasy Analytics Platform</h1>
      <p>Welcome to the NFL Fantasy Analytics Platform!</p>
      <p>Frontend is running successfully.</p>
      <hr />
      <p>Next steps:</p>
      <ul>
        <li>Backend API: <a href="http://localhost:8080/health">http://localhost:8080/health</a></li>
        <li>This frontend: <a href="http://localhost:3000">http://localhost:3000</a></li>
      </ul>
    </div>
  )
}