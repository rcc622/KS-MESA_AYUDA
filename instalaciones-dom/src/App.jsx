import { useState } from 'react';
import './index.css';
import Sidebar from './components/Sidebar';
import VistaA_Agenda from './views/VistaA_Agenda';
import VistaC_Detalle from './views/VistaC_Detalle';
import VistaD_Reagendados from './views/VistaD_Reagendados';
import VistaE_Import from './views/VistaE_Import';
import VistaF_Reporte from './views/VistaF_Reporte';
import VistaI_Cortes from './views/VistaI_Cortes';
import VistaL_Cuadrillas from './views/VistaL_Cuadrillas';

export default function App() {
  const [vista, setVista] = useState('agenda');
  const [proyectoSeleccionado, setProyectoSeleccionado] = useState(null);

  const renderVista = () => {
    switch (vista) {
      case 'agenda':
        return (
          <VistaA_Agenda
            setVista={setVista}
            setProyectoSeleccionado={setProyectoSeleccionado}
          />
        );
      case 'detalle':
        return (
          <VistaC_Detalle
            proyecto={proyectoSeleccionado}
            setVista={setVista}
          />
        );
      case 'reagendados':
        return (
          <VistaD_Reagendados
            setVista={setVista}
            setProyectoSeleccionado={setProyectoSeleccionado}
          />
        );
      case 'import':
        return <VistaE_Import />;
      case 'reporte':
        return <VistaF_Reporte />;
      case 'cortes':
        return <VistaI_Cortes />;
      case 'cuadrillas':
        return <VistaL_Cuadrillas />;
      default:
        return null;
    }
  };

  return (
    <div className="app-layout">
      <Sidebar vista={vista} setVista={setVista} />
      <main className="main-content">
        {renderVista()}
      </main>
    </div>
  );
}
