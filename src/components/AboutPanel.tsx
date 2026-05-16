export default function AboutPanel() {
  return (
    <div className="about-panel">
      <h2>About Me</h2>
      <p>
        I am a software developer with 4 years of professional experience building modern web applications, real-time systems, and AI-assisted products. I enjoy solving complex problems, designing strong user experiences, and shipping reliable applications with clean code.
      </p>
      <div className="about-grid">
        <div>
          <h3>Experience</h3>
          <ul>
            <li>Built full-stack apps using React, TypeScript, Node.js, and Supabase.</li>
            <li>Designed and launched AI-powered chat and speech workflows with real-time media.</li>
            <li>Worked in agile teams to deliver features, MVPs, and polished dashboard experiences.</li>
          </ul>
        </div>
        <div>
          <h3>Skills</h3>
          <ul>
            <li>React, Vite, TypeScript, CSS, Tailwind</li>
            <li>Realtime APIs, WebRTC, OpenAI / generative AI</li>
            <li>Supabase, REST, GitHub Actions, CI/CD</li>
          </ul>
        </div>
      </div>
      <div className="resume-card">
        <h3>About this developer</h3>
        <p>
          Passionate about developer tools, intuitive interfaces, and data-driven decisions, I partner closely with product teams to iterate quickly while maintaining high quality. I value clean architecture, reusable components, and strong collaboration with designers and engineers.
        </p>
      </div>
    </div>
  );
}
