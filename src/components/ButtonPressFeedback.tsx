'use client';

import { useEffect } from 'react';
import { bindButtonPressFeedback } from '../../shared/site/buttonPressFeedback';

export default function ButtonPressFeedback() {
  useEffect(() => bindButtonPressFeedback(document), []);
  return null;
}
