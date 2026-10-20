import React from 'react';
import styles from './Tag.module.css';

interface TagProps {
  children: React.ReactNode;
  variant?: 'gold' | 'muted' | 'success' | 'info' | 'danger';
}

export const Tag: React.FC<TagProps> = ({ children, variant = 'muted' }) => {
  return <span className={`${styles.tag} ${styles[`tag-${variant}`]}`}>{children}</span>;
};
