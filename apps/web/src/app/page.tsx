'use client';

import { useRouter } from 'next/navigation';
import styles from './page.module.css';

export default function HomePage() {
  const router = useRouter();

  return (
    <main className={styles.container}>
      {/* Background Gradient Orbs */}
      <div className={styles.bgOrb1} />
      <div className={styles.bgOrb2} />

      <div className={styles.content}>
        {/* Logo / Brand */}
        <div className={styles.brand}>
          <div className={styles.logoIcon}>🏛️</div>
          <h1 className={styles.title}>
            <span className="gradient-text">Arbitration</span> Sandbox
          </h1>
          <p className={styles.subtitle}>
            Secure MCQ Examination Platform
          </p>
        </div>

        {/* Portal Selection */}
        <div className={styles.portals}>
          <button
            className={styles.portalCard}
            onClick={() => router.push('/login')}
            id="student-portal-btn"
          >
            <div className={styles.portalIcon}>📝</div>
            <h2 className={styles.portalTitle}>Candidate Portal</h2>
            <p className={styles.portalDesc}>
              Take your examination with your provided credentials
            </p>
            <span className={styles.portalArrow}>→</span>
          </button>

          <button
            className={styles.portalCard}
            onClick={() => router.push('/admin/login')}
            id="admin-portal-btn"
          >
            <div className={styles.portalIcon}>⚙️</div>
            <h2 className={styles.portalTitle}>Admin Portal</h2>
            <p className={styles.portalDesc}>
              Manage exams, candidates, and view results
            </p>
            <span className={styles.portalArrow}>→</span>
          </button>
        </div>
      </div>
    </main>
  );
}
