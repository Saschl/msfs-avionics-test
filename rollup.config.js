import typescript from '@rollup/plugin-typescript';
import resolve from '@rollup/plugin-node-resolve';
import scss from 'rollup-plugin-scss'


/* export default {
  input: 'DcduInstrument.tsx',
  output: {
    dir: 'build',
    format: 'es'
  },
  plugins: [scss({ output: 'build/dcduinstrument.css' }), resolve(), typescript()]
} */

export default {
  input: 'pfd/instrument.tsx',
  output: {
    dir: 'build',
    format: 'es'
  },
  plugins: [scss({ output: 'build/pfd.css'}), resolve(), typescript()]
} 