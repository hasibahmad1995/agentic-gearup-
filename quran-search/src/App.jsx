import { AuthProvider } from './AuthContext'
import QuranSearch from './QuranSearch'

export default function App() {
  return (
    <AuthProvider>
      <QuranSearch />
    </AuthProvider>
  )
}
