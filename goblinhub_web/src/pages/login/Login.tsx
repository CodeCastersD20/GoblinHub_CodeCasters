
import "./Login.css"
import logo from '../../components/logo/logo.png'

const Login: React.FC = () => {
    return(
        <div className="base">
            <div className='logo'>
                <img src={logo} alt="goblin" className="goblin" />
            </div>
            <div className='form'>
                <label className="inicio">Iniciar sesión</label>
                <input type="text" placeholder="Correo electrónico" />
                <input type="password" placeholder="Contraseña" />
                <a href="/forgot-password">¿Olvidaste tu contraseña?</a>
                <button className="entrar">Entrar</button>
                <p>¿No tienes una cuenta?</p>
                <a href="/register">Regístrate aquí</a>
            </div>
        </div>
    )
}


export default Login;
