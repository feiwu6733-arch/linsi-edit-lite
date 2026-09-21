import { defineConfig } from 'vite';
import aacWorkerPlugin from './aacWorkerPlugin.mjs';
export default defineConfig({base:'./',plugins:[aacWorkerPlugin()],build:{target:'es2022',sourcemap:false},server:{host:'127.0.0.1',strictPort:true}});
