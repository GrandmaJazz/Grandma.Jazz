import { defineConfig } from 'vitest/config';
import path from 'node:path';
export default defineConfig({test:{environment:'node',include:['tests/quiz-host.test.ts'],setupFiles:[],fileParallelism:false,testTimeout:20000,hookTimeout:30000},resolve:{alias:{'@shared':path.resolve(import.meta.dirname,'shared'),'@':path.resolve(import.meta.dirname,'client/src')}}});
