import './Register.css'
import logo from '../components/logo/logo.png'

function Register() {
  return (<div>
    <div className="base">
        <div className='encabezado'>
            <img src={logo} alt="goblin" className="goblin"/>
            <label className="title">Unete a la comunidad</label>
            <p className="subtitle">Tu aventura comienza aqui</p>
        </div>
        <div className="formulario">
            <div className="fases"> 
                <div className="fase1">1</div>
                <div className="fase2">2</div>
                <div className="fase3">3</div>
            </div>
            <div>
                <h2>Informacion personal</h2>
                <p>cuentanos sobre ti</p>

                <label className="nombre">Nombre</label>
                <input type="text" placeholder="Tu nombre" className="input-name"/>

                <label className="apellido">Apellido</label>
                <input type="text" placeholder="Tu apellido" className="input-apellido"/>

                <label className="nacimiento">Fecha de nacimiento</label>
                <input type="date" className="input-nacimiento"/>

                <label className="telefono">Telefono</label>
                <input type="tel" placeholder="Tu telefono" className="input-telefono"/>

                <label className="correo">Correo electronico</label>
                <input type="email" placeholder="Tu correo electronico" className="input-correo"/>

                <label className="contrasena">Contraseña</label>
                <input type="password" placeholder="Tu contraseña" className="input-contrasena"/>

                <label className="encuesta">¿Como te enteraste de nosotros?</label>
                <input type="text" placeholder="Tu respuesta" className="input-encuesta"/>

                <button className="regresar">Regresar</button>
                <button className="siguiente">Siguiente</button>
            </div>
        </div>
    </div>
  </div>)
}




export default Register;