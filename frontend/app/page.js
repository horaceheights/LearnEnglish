import LessonPlayer from "../components/LessonPlayer";
import { getLesson, getLessons } from "../lib/api";

export default async function HomePage() {
  try {
    const lessons = await getLessons();
    const lesson = await getLesson("lesson-1-people-actions");

    return <LessonPlayer lesson={lesson} lessons={lessons} />;
  } catch (error) {
    return (
      <main
        style={{
          minHeight: "100vh",
          display: "grid",
          placeItems: "center",
          padding: "24px",
        }}
      >
        <section
          style={{
            maxWidth: "760px",
            width: "100%",
            background: "#fffdf9",
            border: "1px solid #dbcdb3",
            borderRadius: "24px",
            padding: "28px",
            boxShadow: "0 14px 40px rgba(22, 33, 39, 0.06)",
          }}
        >
          <div style={{ fontSize: 12, letterSpacing: "0.08em", textTransform: "uppercase", color: "#5e6d73" }}>
            Setup Needed
          </div>
          <h1 style={{ margin: "10px 0 12px" }}>Backend not reachable</h1>
          <p style={{ margin: "0 0 18px", color: "#5e6d73", lineHeight: 1.6 }}>
            {error.message}
          </p>
          <p style={{ margin: "0 0 10px", fontWeight: 700 }}>Start the backend from the repo root with:</p>
          <pre
            style={{
              margin: 0,
              padding: "16px",
              borderRadius: "16px",
              background: "#f2ebdc",
              overflowX: "auto",
            }}
          >
            {`cd backend
pip install -r requirements.txt
uvicorn app.main:app --reload`}
          </pre>
          <p style={{ margin: "18px 0 10px", fontWeight: 700 }}>Then run the frontend with:</p>
          <pre
            style={{
              margin: 0,
              padding: "16px",
              borderRadius: "16px",
              background: "#f2ebdc",
              overflowX: "auto",
            }}
          >
            {`cd frontend
npm install
npm run dev`}
          </pre>
        </section>
      </main>
    );
  }
}
