import { getAdminSummary } from "../../lib/adminApi";
import AdminDashboard from "./AdminDashboard";
import styles from "./admin.module.css";

export default async function AdminPage() {
  let summary;

  try {
    summary = await getAdminSummary();
  } catch (error) {
    return (
      <main className={styles.page}>
        <section className={styles.errorCard}>
          <p className={styles.eyebrow}>Testing dashboard</p>
          <h1>Admin dashboard</h1>
          <p>Could not load tracking data: {error.message}</p>
        </section>
      </main>
    );
  }

  return <AdminDashboard summary={summary} />;
}
