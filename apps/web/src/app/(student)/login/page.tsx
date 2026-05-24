'use client';

import { useState, useRef, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import styles from './page.module.css';

// ── Icons ────────────────────────────────────────────────────────────────────

function UserIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
      <circle cx="12" cy="7" r="4"/>
    </svg>
  );
}

function MailIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect width="20" height="16" x="2" y="4" rx="2"/>
      <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/>
    </svg>
  );
}

function KeyIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="m21 2-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0 3 3L22 7l-3-3m-3.5 3.5L19 4"/>
    </svg>
  );
}

function AlertIcon() {
  return (
    <svg className={styles.alertIcon} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10"/>
      <line x1="12" x2="12" y1="8" y2="12"/>
      <line x1="12" x2="12.01" y1="16" y2="16"/>
    </svg>
  );
}

// ── Types ────────────────────────────────────────────────────────────────────

interface FormValues {
  name: string;
  email: string;
  examCode: string;
}

interface FormErrors {
  name?: string;
  email?: string;
  examCode?: string;
}

// ── Validation ───────────────────────────────────────────────────────────────

function validate(values: FormValues): FormErrors {
  const errors: FormErrors = {};

  if (!values.name.trim()) {
    errors.name = 'Full name is required.';
  } else if (values.name.trim().length < 2) {
    errors.name = 'Name must be at least 2 characters.';
  }

  if (!values.email.trim()) {
    errors.email = 'Email address is required.';
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email)) {
    errors.email = 'Please enter a valid email address.';
  }

  if (!values.examCode.trim()) {
    errors.examCode = 'Exam code is required.';
  } else if (!/^[A-Z0-9]{6,12}$/.test(values.examCode.toUpperCase())) {
    errors.examCode = 'Exam code must be 6–12 uppercase letters/numbers.';
  }

  return errors;
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function CandidateLoginPage() {
  const router = useRouter();

  const [values, setValues] = useState<FormValues>({ name: '', email: '', examCode: '' });
  const [errors, setErrors] = useState<FormErrors>({});
  const [serverError, setServerError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const nameRef = useRef<HTMLInputElement>(null);

  function handleChange(field: keyof FormValues) {
    return (e: React.ChangeEvent<HTMLInputElement>) => {
      const val = field === 'examCode' ? e.target.value.toUpperCase() : e.target.value;
      setValues((prev) => ({ ...prev, [field]: val }));
      // Clear field-level error on change
      if (errors[field]) setErrors((prev) => ({ ...prev, [field]: undefined }));
      if (serverError) setServerError('');
    };
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setServerError('');

    const fieldErrors = validate(values);
    if (Object.keys(fieldErrors).length > 0) {
      setErrors(fieldErrors);
      return;
    }

    setIsLoading(true);
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000);

      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/auth/candidate/login`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            name: values.name.trim(),
            email: values.email.trim().toLowerCase(),
            examCode: values.examCode.trim().toUpperCase(),
          }),
          signal: controller.signal,
        },
      );

      clearTimeout(timeoutId);

      const data = await res.json();

      if (!res.ok) {
        setServerError(data?.message ?? 'Login failed. Please check your details.');
        return;
      }

      // Redirect to exam shell
      router.push('/exam');
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') {
        setServerError('Request timed out. Please try again.');
      } else {
        setServerError('Unable to reach the server. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <main className={styles.page}>
      <div className={styles.card}>
        {/* Header */}
        <div className={styles.header}>
          <div className={styles.logoIcon}>📋</div>
          <h1 className={styles.title}>Candidate Login</h1>
          <p className={styles.subtitle}>
            Enter your details exactly as registered.
            <br />
            Your exam code was provided by the administrator.
          </p>
        </div>

        {/* Error banner */}
        {serverError && (
          <div className={styles.alert} role="alert">
            <AlertIcon />
            <span>{serverError}</span>
          </div>
        )}

        {/* Form */}
        <form className={styles.form} onSubmit={handleSubmit} noValidate>
          <Input
            ref={nameRef}
            label="Full Name"
            type="text"
            placeholder="As registered by administrator"
            autoComplete="name"
            value={values.name}
            onChange={handleChange('name')}
            error={errors.name}
            icon={<UserIcon />}
            disabled={isLoading}
          />

          <Input
            label="Email Address"
            type="email"
            placeholder="you@example.com"
            autoComplete="email"
            value={values.email}
            onChange={handleChange('email')}
            error={errors.email}
            icon={<MailIcon />}
            disabled={isLoading}
          />

          <Input
            label="Exam Code"
            type="text"
            placeholder="E.g. EXAM2025"
            autoComplete="off"
            value={values.examCode}
            onChange={handleChange('examCode')}
            error={errors.examCode}
            icon={<KeyIcon />}
            disabled={isLoading}
            className={styles.examCodeInput}
            maxLength={12}
          />

          <Button
            type="submit"
            variant="primary"
            size="lg"
            fullWidth
            isLoading={isLoading}
            className={styles.submitBtn}
          >
            {isLoading ? 'Verifying…' : 'Enter Exam'}
          </Button>
        </form>

        {/* Footer */}
        <p className={styles.footer}>
          Are you an administrator?{' '}
          <a href="/admin/login">Log in here</a>
        </p>
      </div>
    </main>
  );
}
