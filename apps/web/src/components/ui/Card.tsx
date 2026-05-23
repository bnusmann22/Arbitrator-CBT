import { ReactNode } from 'react';
import styles from './Card.module.css';

interface CardProps {
  children: ReactNode;
  className?: string;
  hover?: boolean;
  padding?: 'sm' | 'md' | 'lg';
}

export default function Card({
  children,
  className = '',
  hover = false,
  padding = 'md',
}: CardProps) {
  return (
    <div
      className={`${styles.card} ${hover ? styles.hoverable : ''} ${styles[`pad-${padding}`]} ${className}`}
    >
      {children}
    </div>
  );
}
