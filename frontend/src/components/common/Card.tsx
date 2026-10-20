import React from 'react';
import styles from './Card.module.css';

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  variant?: 'default' | 'elevated';
}

export const Card: React.FC<CardProps> = ({
  variant = 'default',
  children,
  className = '',
  ...props
}) => {
  return (
    <div
      className={`${styles.card} ${styles[`card-${variant}`]} ${className}`}
      {...props}
    >
      {children}
    </div>
  );
};
