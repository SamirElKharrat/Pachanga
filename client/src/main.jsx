// main.jsx
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Layoutlet from './components/molecules/layoutlet'
import ProtectedRoute from './components/route/ProtectedRoute'
import Auth from './components/atoms/AuthForm'
import Home from './components/molecules/Home'
import AdminRoute from './components/route/AdminRoute'
import Admin from './components/molecules/Admin'
import League from './components/molecules/League'
import Team from './components/molecules/Team'
import Prediction from './components/molecules/Prediction'
import User from './components/molecules/User'
import './components/atoms/AlertInfo' // Importamos para inicializar la configuración
import AlertProvider from './components/atoms/AlertInfo'
import { App } from 'antd';

function Root() {
  return (
    <App>
      <AlertProvider>
        <BrowserRouter>
          <Routes>
            <Route path='/login' element={<Auth method={"login"} />} />
            <Route path='/register' element={<Auth method={"register"} />} />
            <Route path='/' element={<Layoutlet />}>
              <Route element={<ProtectedRoute />}>
                <Route index element={<Home />} />
                <Route path='/leagues' element={<League />} />
                <Route path='/leagues/:id' element={<League />} />
                <Route path='/teams' element={<Team />} />
                <Route path='/teams/:id' element={<Team />} />
                <Route path='/predictions' element={<Prediction />} />
                <Route path='/user' element={<User />} />
              </Route>
              <Route element={<AdminRoute />}>
                <Route path='/admin' element={<Admin />} />
              </Route>
            </Route>
          </Routes>
        </BrowserRouter>
      </AlertProvider>
    </App>
  )
}

createRoot(document.getElementById('root')).render(<Root />);
