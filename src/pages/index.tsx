// src/pages/index.tsx
import React from 'react';
import { Redirect } from '@docusaurus/router';
import useBaseUrl from '@docusaurus/useBaseUrl';

export default function Home(): JSX.Element {
  // 会自动把 /intro 拼上 baseUrl（如 /my-repo/）与当前语言前缀（如 /en/）
  const to = useBaseUrl('/intro');
  return <Redirect to={to} />;
}
