
import type { AppProps } from 'next/app'
import '../styles/globals.css'
import DebugBar from '../components/DebugBar'
export default function MyApp({ Component, pageProps }: AppProps){
  return <>
    <Component {...pageProps} />
    <DebugBar />
  </>
}
