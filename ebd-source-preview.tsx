import React from 'react';
import { createRoot } from 'react-dom/client';
import './src/index.css';
import EditorialSourceImport from './src/components/ebd/EditorialSourceImport';
import { createEmptyEditorialDocument } from './src/types/ebdEditorial';
createRoot(document.getElementById('root')!).render(<main style={{ padding: 16, maxWidth: 760, margin: 'auto' }}><EditorialSourceImport lessonId="preview" lessonNumber={11} day={createEmptyEditorialDocument().days[0]} disabled={false} onApply={() => {}} /></main>);
