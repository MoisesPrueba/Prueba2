import React, { useState, useEffect } from 'react';
import { useUser } from '../contexts/UserContext';
import { supabase } from '../lib/supabase';
import { 
  Search, 
  FileText, 
  Download, 
  Filter, 
  ChevronRight, 
  Calendar, 
  Pill, 
  Clipboard,
  Stethoscope,
  AlertTriangle,
  Heart,
  Activity,
  TestTube,
  Scissors,
  Bed,
  User,
  Clock,
  MapPin,
  Phone,
  Mail,
  Shield,
  Eye,
  EyeOff,
  Plus,
  Loader
} from 'lucide-react';

// Tipos de datos
interface PatientInfo {
  id_persona: number;
  prenombres: string;
  primer_apellido: string;
  segundo_apellido: string;
  dni_idcarnet: string;
  sexo: string;
  fecha_nacimiento: string;
  direccion_legal: string;
  correo_electronico?: string;
  numero_celular_personal?: string;
  numero_celular_emergencia?: string;
}

interface MedicalProfile {
  id_perfil_medico: number;
  fecha_atencion: string;
  grupo_sanguineo?: string;
  ambiente_residencia?: string;
  orientacion_sexual?: string;
  vida_sexual_activa?: boolean;
  alergias: Array<{
    id_alergia: number;
    nombre_alergia: string;
    componente_alergeno: string;
  }>;
}

interface MedicalHistory {
  id_historia: number;
  fecha_creacion: string;
  estado: {
    nombre_estado: string;
    descripcion: string;
  };
}

interface MedicalService {
  id_servicio_medico: number;
  fecha_servicio: string;
  hora_inicio_servicio: string;
  hora_fin_servicio: string;
  cita_medica: {
    id_personal_medico: number;
    personal_medico: {
      persona: {
        prenombres: string;
        primer_apellido: string;
        segundo_apellido: string;
      };
      especialidad: {
        descripcion: string;
        area_asignada: string;
      };
    };
  };
  consulta_medica?: {
    motivo_consulta: string;
    observaciones_generales: string;
    tipo_servicio: {
      nombre: string;
    };
    subtipo_servicio: {
      nombre: string;
    };
  };
  examenes: Array<{
    id_examen: number;
    descripcion_procedimiento: string;
    fecha_hora_atencion: string;
    descripcion: string;
    tipo_procedimiento: string;
    tipo_laboratorio: string;
    resultado: string;
  }>;
  diagnosticos: Array<{
    id_diagnostico: number;
    detalle: string;
    morbilidad: {
      descripcion: string;
      fecha_identificacion: string;
      tipo: string;
      nivel_gravedad: string;
      contagiosa: boolean;
      cie10: {
        codigo: string;
        descripcion: string;
      };
    };
    sintomas: Array<{
      nombre_sintoma: string;
      fecha_primera_manifestacion: string;
      descripcion: string;
      severidad: number;
      estado_actual: string;
    }>;
  }>;
  tratamientos: Array<{
    id_tratamiento: number;
    razon: string;
    duracion_cantidad: number;
    observaciones: string;
    unidad_tiempo: {
      nombre: string;
    };
    medicamentos: Array<{
      medicamento: {
        nombre_comercial: string;
        metodo_administracion: string;
        concentracion: string;
        laboratorio: string;
      };
      motivo: string;
      cantidad_dosis: number;
      frecuencia: string;
    }>;
  }>;
  terapias: Array<{
    id_terapia: number;
    descripcion: string;
    observaciones: string;
    resultados: string;
  }>;
  intervenciones_quirurgicas: Array<{
    id_intervencion: number;
    procedimiento_quirurgico: string;
    tipo_anestesia: string;
    observaciones: string;
  }>;
  controles: Array<{
    id_control: number;
    pulso_cardiaco: number;
    presion_diastolica: number;
    presion_sistolica: number;
    oxigenacion: number;
    estado_paciente: string;
    observaciones: string;
  }>;
  ingresos_hospitalizacion: Array<{
    id_ingreso_hospitalizacion: number;
    razon_ingreso: string;
    atenciones_necesarias: string;
    fecha_estimada_alta: string;
    nro_camas: number;
  }>;
  altas_hospitalizacion: Array<{
    id_alta_hospitalizacion: number;
    indicaciones_postalta: string;
    motivo_alta: string;
  }>;
}

interface MedicalRecord {
  patientInfo: PatientInfo;
  medicalProfile: MedicalProfile;
  medicalHistory: MedicalHistory;
  medicalServices: MedicalService[];
}

const MedicalRecords: React.FC = () => {
  const { user } = useUser();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRecord, setSelectedRecord] = useState<string | null>(null);
  const [records, setRecords] = useState<Array<{id: string, patientName: string, lastUpdate: string, status: string}>>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  if (!user) return null;

  // Cargar registros médicos según el rol del usuario
  useEffect(() => {
    loadMedicalRecords();
  }, [user.currentRole, user.currentProfileId]);

  const loadMedicalRecords = async () => {
    try {
      setLoading(true);
      setError(null);

      let recordsData: Array<{id: string, patientName: string, lastUpdate: string, status: string}> = [];

      if (user.currentRole === 'patient') {
        // Para pacientes, cargar sus propios registros y los de familiares
        const profileIds = user.profiles.map(profile => profile.id);
        
        for (const profileId of profileIds) {
          const { data: historiaData, error: historiaError } = await supabase
            .from('historia_clinica')
            .select(`
              id_historia,
              fecha_creacion,
              estado_historia_clinica!inner(nombre_estado),
              perfil_medico!inner(
                id_perfil_medico,
                fecha_atencion,
                paciente!inner(
                  persona!inner(
                    prenombres,
                    primer_apellido,
                    segundo_apellido
                  )
                )
              )
            `)
            .eq('perfil_medico.paciente.id_persona', profileId);

          if (historiaError) throw historiaError;

          if (historiaData) {
            historiaData.forEach((historia: any) => {
              const persona = historia.perfil_medico.paciente.persona;
              recordsData.push({
                id: `${profileId}-${historia.id_historia}`,
                patientName: `${persona.prenombres} ${persona.primer_apellido} ${persona.segundo_apellido}`,
                lastUpdate: new Date(historia.perfil_medico.fecha_atencion).toLocaleDateString('es-ES'),
                status: historia.estado_historia_clinica.nombre_estado
              });
            });
          }
        }
      } else if (user.currentRole === 'admin') {
        // Para administradores, cargar todos los registros
        const { data: historiaData, error: historiaError } = await supabase
          .from('historia_clinica')
          .select(`
            id_historia,
            fecha_creacion,
            estado_historia_clinica!inner(nombre_estado),
            perfil_medico!inner(
              id_perfil_medico,
              fecha_atencion,
              paciente!inner(
                id_persona,
                persona!inner(
                  prenombres,
                  primer_apellido,
                  segundo_apellido
                )
              )
            )
          `)
          .limit(50);

        if (historiaError) throw historiaError;

        if (historiaData) {
          recordsData = historiaData.map((historia: any) => {
            const persona = historia.perfil_medico.paciente.persona;
            return {
              id: `${historia.perfil_medico.paciente.id_persona}-${historia.id_historia}`,
              patientName: `${persona.prenombres} ${persona.primer_apellido} ${persona.segundo_apellido}`,
              lastUpdate: new Date(historia.perfil_medico.fecha_atencion).toLocaleDateString('es-ES'),
              status: historia.estado_historia_clinica.nombre_estado
            };
          });
        }
      } else if (user.currentRole === 'medical') {
        // Para personal médico, cargar registros de sus pacientes
        const { data: historiaData, error: historiaError } = await supabase
          .from('historia_clinica')
          .select(`
            id_historia,
            fecha_creacion,
            estado_historia_clinica!inner(nombre_estado),
            perfil_medico!inner(
              id_perfil_medico,
              fecha_atencion,
              paciente!inner(
                id_persona,
                persona!inner(
                  prenombres,
                  primer_apellido,
                  segundo_apellido
                )
              )
            )
          `)
          .limit(50);

        if (historiaError) throw historiaError;

        if (historiaData) {
          recordsData = historiaData.map((historia: any) => {
            const persona = historia.perfil_medico.paciente.persona;
            return {
              id: `${historia.perfil_medico.paciente.id_persona}-${historia.id_historia}`,
              patientName: `${persona.prenombres} ${persona.primer_apellido} ${persona.segundo_apellido}`,
              lastUpdate: new Date(historia.perfil_medico.fecha_atencion).toLocaleDateString('es-ES'),
              status: historia.estado_historia_clinica.nombre_estado
            };
          });
        }
      }

      setRecords(recordsData);
    } catch (error) {
      console.error('Error loading medical records:', error);
      setError('Error al cargar las historias clínicas');
    } finally {
      setLoading(false);
    }
  };

  // Filtrar registros basado en el término de búsqueda
  const filteredRecords = records.filter(record => 
    record.patientName.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Obtener contenido basado en el rol
  let content: React.ReactNode = null;
  
  switch (user.currentRole) {
    case 'patient':
      content = <PatientMedicalRecords 
        records={filteredRecords} 
        selectedRecord={selectedRecord} 
        setSelectedRecord={setSelectedRecord}
        loading={loading}
        error={error}
      />;
      break;
    case 'admin':
      content = <AdminMedicalRecords 
        records={filteredRecords}
        loading={loading}
        error={error}
      />;
      break;
    case 'medical':
      content = <MedicalPersonnelRecords 
        records={filteredRecords} 
        selectedRecord={selectedRecord} 
        setSelectedRecord={setSelectedRecord}
        loading={loading}
        error={error}
      />;
      break;
    default:
      content = <PatientMedicalRecords 
        records={filteredRecords} 
        selectedRecord={selectedRecord} 
        setSelectedRecord={setSelectedRecord}
        loading={loading}
        error={error}
      />;
  }

  return (
    <div className="container mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-semibold text-gray-800">Historias Clínicas</h1>
        
        <div className="relative flex items-center">
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-5 w-5 text-gray-400" />
            </div>
            <input
              type="text"
              placeholder="Buscar historia clínica..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-60 pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
        </div>
      </div>

      {content}
    </div>
  );
};

interface RecordProps {
  records: any[];
  selectedRecord?: string | null;
  setSelectedRecord?: (id: string | null) => void;
  loading: boolean;
  error: string | null;
}

const PatientMedicalRecords: React.FC<RecordProps> = ({ 
  records, 
  selectedRecord, 
  setSelectedRecord,
  loading,
  error 
}) => {
  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-sm p-6">
        <div className="flex items-center justify-center py-12">
          <Loader className="h-8 w-8 animate-spin text-blue-600 mr-3" />
          <span className="text-gray-600">Cargando historias clínicas...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-lg shadow-sm p-6">
        <div className="flex items-center justify-center py-12 text-red-600">
          <AlertTriangle className="h-8 w-8 mr-3" />
          <span>{error}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-sm">
      {selectedRecord ? (
        <MedicalRecordDetail recordId={selectedRecord} onBack={() => setSelectedRecord?.(null)} />
      ) : (
        <div className="p-6">
          <div className="mb-4 flex justify-between items-center">
            <h2 className="text-lg font-medium text-gray-800">Mis Historias Clínicas</h2>
            <button className="flex items-center text-sm text-gray-600 hover:text-gray-800">
              <Filter size={16} className="mr-1" />
              Filtrar
            </button>
          </div>
          
          <div className="space-y-4">
            {records.length > 0 ? (
              records.map((record) => (
                <div 
                  key={record.id}
                  className="border border-gray-200 rounded-md p-4 hover:bg-gray-50 cursor-pointer transition-colors"
                  onClick={() => setSelectedRecord?.(record.id)}
                >
                  <div className="flex justify-between items-center">
                    <div>
                      <div className="flex items-center">
                        <FileText className="h-5 w-5 text-blue-600 mr-2" />
                        <h3 className="font-medium text-gray-800">{record.patientName}</h3>
                      </div>
                      <p className="text-sm text-gray-600 mt-1">
                        Última actualización: {record.lastUpdate} • Estado: {record.status}
                      </p>
                    </div>
                    <ChevronRight className="h-5 w-5 text-gray-400" />
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-8 text-gray-500">
                <FileText className="h-12 w-12 mx-auto text-gray-400 mb-2" />
                <p>No se encontraron historias clínicas</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

const AdminMedicalRecords: React.FC<RecordProps> = ({ records, loading, error }) => {
  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-sm p-6">
        <div className="flex items-center justify-center py-12">
          <Loader className="h-8 w-8 animate-spin text-blue-600 mr-3" />
          <span className="text-gray-600">Cargando historias clínicas...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-lg shadow-sm p-6">
        <div className="flex items-center justify-center py-12 text-red-600">
          <AlertTriangle className="h-8 w-8 mr-3" />
          <span>{error}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      <div className="col-span-1 md:col-span-3 bg-white rounded-lg shadow-sm p-6">
        <div className="mb-4 flex flex-col md:flex-row md:justify-between md:items-center">
          <h2 className="text-lg font-medium text-gray-800 mb-2 md:mb-0">Administración de Historias Clínicas</h2>
          <div className="space-x-3">
            <button className="bg-white border border-gray-300 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-50 transition-colors">
              <Filter size={16} className="inline mr-1" />
              Filtrar
            </button>
            <button className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors">
              + Crear Nueva
            </button>
          </div>
        </div>
        
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Nombre del Paciente
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  DNI
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Última Actualización
                </th>
                <th scope="col" className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Estado
                </th>
                <th scope="col" className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {records.map((record) => (
                <tr key={record.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="text-sm font-medium text-gray-900">{record.patientName}</div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-500">40582934</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-500">{record.lastUpdate}</div>
                  </td>
                  <td className="px-3 py-4 whitespace-nowrap">
                    <span className={`px-3 py-1 text-center inline-flex text-xs leading-5 font-semibold rounded-full ${
                      record.status === 'Activo' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                    }`}>
                      {record.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <button className="text-blue-600 hover:text-blue-800 mr-3">
                      Editar
                    </button>
                    <button className="text-green-600 hover:text-green-800 mr-3">
                      Ver
                    </button>
                    <button className="text-red-600 hover:text-red-800">
                      Archivar
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

const MedicalPersonnelRecords: React.FC<RecordProps> = ({ 
  records, 
  selectedRecord, 
  setSelectedRecord,
  loading,
  error 
}) => {
  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-sm p-6">
        <div className="flex items-center justify-center py-12">
          <Loader className="h-8 w-8 animate-spin text-blue-600 mr-3" />
          <span className="text-gray-600">Cargando historias clínicas...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-lg shadow-sm p-6">
        <div className="flex items-center justify-center py-12 text-red-600">
          <AlertTriangle className="h-8 w-8 mr-3" />
          <span>{error}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-sm">
      {selectedRecord ? (
        <MedicalRecordDetail recordId={selectedRecord} onBack={() => setSelectedRecord?.(null)} showTreatmentOptions={true} />
      ) : (
        <div className="p-6">
          <div className="mb-4 flex justify-between items-center">
            <h2 className="text-lg font-medium text-gray-800">Historias Clínicas de Pacientes</h2>
            <button className="flex items-center text-sm text-gray-600 hover:text-gray-800">
              <Filter size={16} className="mr-1" />
              Filtrar
            </button>
          </div>
          
          <div className="space-y-4">
            {records.length > 0 ? (
              records.map((record) => (
                <div 
                  key={record.id}
                  className="border border-gray-200 rounded-md p-4 hover:bg-gray-50 cursor-pointer transition-colors"
                  onClick={() => setSelectedRecord?.(record.id)}
                >
                  <div className="flex justify-between items-center">
                    <div>
                      <div className="flex items-center">
                        <FileText className="h-5 w-5 text-blue-600 mr-2" />
                        <h3 className="font-medium text-gray-800">{record.patientName}</h3>
                      </div>
                      <p className="text-sm text-gray-600 mt-1">
                        DNI: 40582934 • Última actualización: {record.lastUpdate} • Estado: {record.status}
                      </p>
                    </div>
                    <ChevronRight className="h-5 w-5 text-gray-400" />
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-8 text-gray-500">
                <FileText className="h-12 w-12 mx-auto text-gray-400 mb-2" />
                <p>No se encontraron historias clínicas</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

interface DetailProps {
  recordId: string;
  onBack: () => void;
  showTreatmentOptions?: boolean;
}

const MedicalRecordDetail: React.FC<DetailProps> = ({ recordId, onBack, showTreatmentOptions = false }) => {
  const [medicalRecord, setMedicalRecord] = useState<MedicalRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showSensitiveInfo, setShowSensitiveInfo] = useState(false);

  useEffect(() => {
    loadMedicalRecordDetail();
  }, [recordId]);

  const loadMedicalRecordDetail = async () => {
    try {
      setLoading(true);
      setError(null);

      const [personaId, historiaId] = recordId.split('-');

      // 1. Cargar información del paciente
      const { data: personaData, error: personaError } = await supabase
        .from('persona')
        .select('*')
        .eq('id_persona', personaId)
        .single();

      if (personaError) throw personaError;

      // 2. Cargar historia clínica
      const { data: historiaData, error: historiaError } = await supabase
        .from('historia_clinica')
        .select(`
          *,
          estado_historia_clinica(nombre_estado, descripcion)
        `)
        .eq('id_historia', historiaId)
        .single();

      if (historiaError) throw historiaError;

      // 3. Cargar perfil médico con alergias
      const { data: perfilData, error: perfilError } = await supabase
        .from('perfil_medico')
        .select(`
          *,
          perfil_alergias(
            alergia(
              id_alergia,
              nombre_alergia,
              componente_alergeno
            )
          )
        `)
        .eq('id_perfil_medico', historiaData.id_perfil_medico)
        .single();

      if (perfilError) throw perfilError;

      // 4. Cargar servicios médicos completos
      const { data: serviciosData, error: serviciosError } = await supabase
        .from('servicio_medico')
        .select(`
          *,
          cita_medica(
            id_personal_medico,
            personal_medico(
              persona(prenombres, primer_apellido, segundo_apellido),
              especialidad(descripcion, area_asignada)
            )
          ),
          consulta_medica(
            motivo_consulta,
            observaciones_generales,
            tipo_servicio(nombre),
            subtipo_servicio(nombre)
          ),
          examen(*),
          diagnostico(
            *,
            morbilidad(
              *,
              cie10(codigo, descripcion)
            ),
            sintoma(*)
          ),
          tratamiento(
            *,
            unidad_tiempo(nombre),
            tratamiento_medicamento(
              *,
              medicamento(*)
            )
          ),
          terapia(*),
          intervencion_quirurgica(*),
          control(*),
          ingreso_hospitalizacion(*),
          alta_hospitalizacion(*)
        `)
        .eq('cita_medica.paciente.id_persona', personaId)
        .order('fecha_servicio', { ascending: false });

      if (serviciosError) throw serviciosError;

      // Construir el objeto de registro médico
      const record: MedicalRecord = {
        patientInfo: personaData,
        medicalProfile: {
          ...perfilData,
          alergias: perfilData.perfil_alergias?.map((pa: any) => pa.alergia) || []
        },
        medicalHistory: {
          ...historiaData,
          estado: historiaData.estado_historia_clinica
        },
        medicalServices: serviciosData || []
      };

      setMedicalRecord(record);
    } catch (error) {
      console.error('Error loading medical record detail:', error);
      setError('Error al cargar los detalles de la historia clínica');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-center py-12">
          <Loader className="h-8 w-8 animate-spin text-blue-600 mr-3" />
          <span className="text-gray-600">Cargando detalles de la historia clínica...</span>
        </div>
      </div>
    );
  }

  if (error || !medicalRecord) {
    return (
      <div className="p-6">
        <div className="mb-6">
          <button 
            onClick={onBack}
            className="flex items-center text-blue-600 hover:text-blue-800"
          >
            <span className="mr-1">←</span> Volver
          </button>
        </div>
        <div className="flex items-center justify-center py-12 text-red-600">
          <AlertTriangle className="h-8 w-8 mr-3" />
          <span>{error || 'No se pudo cargar la historia clínica'}</span>
        </div>
      </div>
    );
  }

  const { patientInfo, medicalProfile, medicalHistory, medicalServices } = medicalRecord;

  return (
    <div className="p-6">
      <div className="mb-6">
        <button 
          onClick={onBack}
          className="flex items-center text-blue-600 hover:text-blue-800"
        >
          <span className="mr-1">←</span> Volver
        </button>
      </div>
      
      <div className="flex justify-between items-start mb-6">
        <div>
          <h2 className="text-2xl font-semibold text-gray-800">
            {`${patientInfo.prenombres} ${patientInfo.primer_apellido} ${patientInfo.segundo_apellido}`}
          </h2>
          <p className="text-gray-600">Historia Clínica #{medicalHistory.id_historia}</p>
          <p className="text-sm text-gray-500">
            Estado: {medicalHistory.estado.nombre_estado} • 
            Creada: {new Date(medicalHistory.fecha_creacion).toLocaleDateString('es-ES')}
          </p>
        </div>
        <div className="flex space-x-3">
          <button className="flex items-center px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors">
            <Download size={16} className="mr-2" />
            Descargar
          </button>
          {showTreatmentOptions && (
            <button className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors">
              <Stethoscope size={16} className="mr-2" />
              Registrar Servicio
            </button>
          )}
        </div>
      </div>
      
      {/* Información del Paciente */}
      <div className="bg-gray-50 p-4 rounded-md mb-6">
        <div className="flex justify-between items-center mb-3">
          <h3 className="text-lg font-medium text-gray-800">Información del Paciente</h3>
          <button
            onClick={() => setShowSensitiveInfo(!showSensitiveInfo)}
            className="flex items-center text-sm text-gray-600 hover:text-gray-800"
          >
            {showSensitiveInfo ? <EyeOff size={16} className="mr-1" /> : <Eye size={16} className="mr-1" />}
            {showSensitiveInfo ? 'Ocultar' : 'Mostrar'} información sensible
          </button>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <p className="text-sm text-gray-500">DNI</p>
            <p className="font-medium">{patientInfo.dni_idcarnet}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">Fecha de Nacimiento</p>
            <p className="font-medium">{new Date(patientInfo.fecha_nacimiento).toLocaleDateString('es-ES')}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">Sexo</p>
            <p className="font-medium">{patientInfo.sexo === 'M' ? 'Masculino' : 'Femenino'}</p>
          </div>
          
          {showSensitiveInfo && (
            <>
              <div>
                <p className="text-sm text-gray-500">Dirección</p>
                <p className="font-medium">{patientInfo.direccion_legal}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Teléfono Personal</p>
                <p className="font-medium">{patientInfo.numero_celular_personal || 'No registrado'}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Teléfono de Emergencia</p>
                <p className="font-medium">{patientInfo.numero_celular_emergencia || 'No registrado'}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Correo Electrónico</p>
                <p className="font-medium">{patientInfo.correo_electronico || 'No registrado'}</p>
              </div>
            </>
          )}
          
          <div>
            <p className="text-sm text-gray-500">Grupo Sanguíneo</p>
            <p className="font-medium">{medicalProfile.grupo_sanguineo || 'No registrado'}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">Ambiente de Residencia</p>
            <p className="font-medium">{medicalProfile.ambiente_residencia || 'No registrado'}</p>
          </div>
          
          <div className="md:col-span-3">
            <p className="text-sm text-gray-500">Alergias</p>
            <div className="flex flex-wrap gap-2 mt-1">
              {medicalProfile.alergias.length > 0 ? (
                medicalProfile.alergias.map((alergia) => (
                  <span 
                    key={alergia.id_alergia}
                    className="px-2 py-1 bg-red-100 text-red-800 text-xs rounded-full"
                    title={`Componente: ${alergia.componente_alergeno}`}
                  >
                    {alergia.nombre_alergia}
                  </span>
                ))
              ) : (
                <span className="text-gray-500 text-sm">Sin alergias registradas</span>
              )}
            </div>
          </div>
        </div>
      </div>
      
      {/* Historial Médico */}
      <div>
        <h3 className="text-lg font-medium text-gray-800 mb-3">Historial de Servicios Médicos</h3>
        
        <div className="space-y-6">
          {medicalServices.length > 0 ? (
            medicalServices.map((service) => (
              <MedicalServiceCard key={service.id_servicio_medico} service={service} />
            ))
          ) : (
            <div className="text-center py-8 text-gray-500">
              <Stethoscope className="h-12 w-12 mx-auto text-gray-400 mb-2" />
              <p>No hay servicios médicos registrados</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

interface MedicalServiceCardProps {
  service: MedicalService;
}

const MedicalServiceCard: React.FC<MedicalServiceCardProps> = ({ service }) => {
  const [expanded, setExpanded] = useState(false);

  const formatTime = (time: string) => {
    return new Date(`1970-01-01T${time}`).toLocaleTimeString('es-ES', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const doctor = service.cita_medica?.personal_medico;
  const doctorName = doctor ? 
    `${doctor.persona.prenombres} ${doctor.persona.primer_apellido} ${doctor.persona.segundo_apellido}` : 
    'No especificado';
  const specialty = doctor?.especialidad?.descripcion || 'No especificado';

  return (
    <div className="border border-gray-200 rounded-md">
      <div 
        className="p-4 cursor-pointer hover:bg-gray-50"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex justify-between items-start">
          <div className="flex-1">
            <div className="flex items-center mb-2">
              <Stethoscope className="h-5 w-5 text-blue-600 mr-2" />
              <h4 className="font-medium text-gray-800">
                {service.consulta_medica?.tipo_servicio?.nombre || 'Servicio Médico'}
              </h4>
              {service.consulta_medica?.subtipo_servicio && (
                <span className="ml-2 px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">
                  {service.consulta_medica.subtipo_servicio.nombre}
                </span>
              )}
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-sm text-gray-600">
              <div className="flex items-center">
                <Calendar className="h-4 w-4 mr-1" />
                {new Date(service.fecha_servicio).toLocaleDateString('es-ES')}
              </div>
              <div className="flex items-center">
                <Clock className="h-4 w-4 mr-1" />
                {formatTime(service.hora_inicio_servicio)} - {formatTime(service.hora_fin_servicio)}
              </div>
              <div className="flex items-center">
                <User className="h-4 w-4 mr-1" />
                {doctorName}
              </div>
            </div>
            
            {service.consulta_medica?.motivo_consulta && (
              <p className="text-sm text-gray-700 mt-2">
                <strong>Motivo:</strong> {service.consulta_medica.motivo_consulta}
              </p>
            )}
          </div>
          
          <ChevronRight 
            className={`h-5 w-5 text-gray-400 transition-transform ${expanded ? 'rotate-90' : ''}`} 
          />
        </div>
      </div>
      
      {expanded && (
        <div className="border-t border-gray-200 p-4 bg-gray-50">
          <div className="space-y-4">
            {/* Especialidad del médico */}
            {specialty !== 'No especificado' && (
              <div>
                <p className="text-sm font-medium text-gray-700">Especialidad:</p>
                <p className="text-sm text-gray-600">{specialty}</p>
              </div>
            )}

            {/* Observaciones generales */}
            {service.consulta_medica?.observaciones_generales && (
              <div>
                <p className="text-sm font-medium text-gray-700">Observaciones:</p>
                <p className="text-sm text-gray-600">{service.consulta_medica.observaciones_generales}</p>
              </div>
            )}

            {/* Diagnósticos */}
            {service.diagnosticos && service.diagnosticos.length > 0 && (
              <div>
                <p className="text-sm font-medium text-gray-700 mb-2">Diagnósticos:</p>
                <div className="space-y-2">
                  {service.diagnosticos.map((diagnostico) => (
                    <div key={diagnostico.id_diagnostico} className="bg-white p-3 rounded border">
                      <div className="flex items-start">
                        <Clipboard className="h-4 w-4 text-green-600 mr-2 mt-1" />
                        <div className="flex-1">
                          <p className="text-sm font-medium">
                            {diagnostico.morbilidad.descripcion}
                            {diagnostico.morbilidad.cie10 && (
                              <span className="ml-2 text-xs text-gray-500">
                                ({diagnostico.morbilidad.cie10.codigo})
                              </span>
                            )}
                          </p>
                          {diagnostico.detalle && (
                            <p className="text-xs text-gray-600 mt-1">{diagnostico.detalle}</p>
                          )}
                          <div className="flex items-center mt-1 text-xs text-gray-500">
                            <span>Tipo: {diagnostico.morbilidad.tipo}</span>
                            {diagnostico.morbilidad.nivel_gravedad && (
                              <span className="ml-2">Gravedad: {diagnostico.morbilidad.nivel_gravedad}</span>
                            )}
                            {diagnostico.morbilidad.contagiosa && (
                              <span className="ml-2 px-1 bg-yellow-100 text-yellow-800 rounded">Contagiosa</span>
                            )}
                          </div>
                          
                          {/* Síntomas */}
                          {diagnostico.sintomas && diagnostico.sintomas.length > 0 && (
                            <div className="mt-2">
                              <p className="text-xs font-medium text-gray-700">Síntomas:</p>
                              <div className="flex flex-wrap gap-1 mt-1">
                                {diagnostico.sintomas.map((sintoma, index) => (
                                  <span 
                                    key={index}
                                    className="px-2 py-1 bg-orange-100 text-orange-800 text-xs rounded"
                                    title={`Severidad: ${sintoma.severidad}/10 - Estado: ${sintoma.estado_actual}`}
                                  >
                                    {sintoma.nombre_sintoma}
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Tratamientos */}
            {service.tratamientos && service.tratamientos.length > 0 && (
              <div>
                <p className="text-sm font-medium text-gray-700 mb-2">Tratamientos:</p>
                <div className="space-y-2">
                  {service.tratamientos.map((tratamiento) => (
                    <div key={tratamiento.id_tratamiento} className="bg-white p-3 rounded border">
                      <div className="flex items-start">
                        <Pill className="h-4 w-4 text-purple-600 mr-2 mt-1" />
                        <div className="flex-1">
                          {tratamiento.razon && (
                            <p className="text-sm font-medium">{tratamiento.razon}</p>
                          )}
                          {tratamiento.duracion_cantidad && tratamiento.unidad_tiempo && (
                            <p className="text-xs text-gray-600">
                              Duración: {tratamiento.duracion_cantidad} {tratamiento.unidad_tiempo.nombre}
                            </p>
                          )}
                          {tratamiento.observaciones && (
                            <p className="text-xs text-gray-600 mt-1">{tratamiento.observaciones}</p>
                          )}
                          
                          {/* Medicamentos */}
                          {tratamiento.medicamentos && tratamiento.medicamentos.length > 0 && (
                            <div className="mt-2">
                              <p className="text-xs font-medium text-gray-700">Medicamentos:</p>
                              <div className="space-y-1 mt-1">
                                {tratamiento.medicamentos.map((med, index) => (
                                  <div key={index} className="bg-purple-50 p-2 rounded text-xs">
                                    <p className="font-medium">{med.medicamento.nombre_comercial}</p>
                                    <p className="text-gray-600">
                                      {med.medicamento.concentracion} - {med.medicamento.laboratorio}
                                    </p>
                                    <p className="text-gray-600">
                                      Dosis: {med.cantidad_dosis} - {med.frecuencia}
                                    </p>
                                    {med.medicamento.metodo_administracion && (
                                      <p className="text-gray-600">Vía: {med.medicamento.metodo_administracion}</p>
                                    )}
                                    {med.motivo && (
                                      <p className="text-gray-600">Motivo: {med.motivo}</p>
                                    )}
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Exámenes */}
            {service.examenes && service.examenes.length > 0 && (
              <div>
                <p className="text-sm font-medium text-gray-700 mb-2">Exámenes:</p>
                <div className="space-y-2">
                  {service.examenes.map((examen) => (
                    <div key={examen.id_examen} className="bg-white p-3 rounded border">
                      <div className="flex items-start">
                        <TestTube className="h-4 w-4 text-blue-600 mr-2 mt-1" />
                        <div className="flex-1">
                          <p className="text-sm font-medium">
                            {examen.descripcion_procedimiento || examen.tipo_procedimiento}
                          </p>
                          {examen.tipo_laboratorio && (
                            <p className="text-xs text-gray-600">Laboratorio: {examen.tipo_laboratorio}</p>
                          )}
                          {examen.descripcion && (
                            <p className="text-xs text-gray-600 mt-1">{examen.descripcion}</p>
                          )}
                          {examen.resultado && (
                            <div className="mt-2 p-2 bg-green-50 rounded">
                              <p className="text-xs font-medium text-green-800">Resultado:</p>
                              <p className="text-xs text-green-700">{examen.resultado}</p>
                            </div>
                          )}
                          <p className="text-xs text-gray-500 mt-1">
                            Fecha: {new Date(examen.fecha_hora_atencion).toLocaleString('es-ES')}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Terapias */}
            {service.terapias && service.terapias.length > 0 && (
              <div>
                <p className="text-sm font-medium text-gray-700 mb-2">Terapias:</p>
                <div className="space-y-2">
                  {service.terapias.map((terapia) => (
                    <div key={terapia.id_terapia} className="bg-white p-3 rounded border">
                      <div className="flex items-start">
                        <Activity className="h-4 w-4 text-green-600 mr-2 mt-1" />
                        <div className="flex-1">
                          <p className="text-sm font-medium">{terapia.descripcion}</p>
                          {terapia.observaciones && (
                            <p className="text-xs text-gray-600 mt-1">{terapia.observaciones}</p>
                          )}
                          {terapia.resultados && (
                            <div className="mt-2 p-2 bg-green-50 rounded">
                              <p className="text-xs font-medium text-green-800">Resultados:</p>
                              <p className="text-xs text-green-700">{terapia.resultados}</p>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Intervenciones Quirúrgicas */}
            {service.intervenciones_quirurgicas && service.intervenciones_quirurgicas.length > 0 && (
              <div>
                <p className="text-sm font-medium text-gray-700 mb-2">Intervenciones Quirúrgicas:</p>
                <div className="space-y-2">
                  {service.intervenciones_quirurgicas.map((intervencion) => (
                    <div key={intervencion.id_intervencion} className="bg-white p-3 rounded border">
                      <div className="flex items-start">
                        <Scissors className="h-4 w-4 text-red-600 mr-2 mt-1" />
                        <div className="flex-1">
                          <p className="text-sm font-medium">{intervencion.procedimiento_quirurgico}</p>
                          {intervencion.tipo_anestesia && (
                            <p className="text-xs text-gray-600">Anestesia: {intervencion.tipo_anestesia}</p>
                          )}
                          {intervencion.observaciones && (
                            <p className="text-xs text-gray-600 mt-1">{intervencion.observaciones}</p>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Controles de Signos Vitales */}
            {service.controles && service.controles.length > 0 && (
              <div>
                <p className="text-sm font-medium text-gray-700 mb-2">Controles de Signos Vitales:</p>
                <div className="space-y-2">
                  {service.controles.map((control) => (
                    <div key={control.id_control} className="bg-white p-3 rounded border">
                      <div className="flex items-start">
                        <Heart className="h-4 w-4 text-red-600 mr-2 mt-1" />
                        <div className="flex-1">
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
                            <div>
                              <span className="font-medium">Pulso:</span> {control.pulso_cardiaco} bpm
                            </div>
                            <div>
                              <span className="font-medium">Presión:</span> {control.presion_sistolica}/{control.presion_diastolica} mmHg
                            </div>
                            <div>
                              <span className="font-medium">Oxigenación:</span> {control.oxigenacion}%
                            </div>
                            <div>
                              <span className="font-medium">Estado:</span> {control.estado_paciente}
                            </div>
                          </div>
                          {control.observaciones && (
                            <p className="text-xs text-gray-600 mt-1">{control.observaciones}</p>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Ingresos de Hospitalización */}
            {service.ingresos_hospitalizacion && service.ingresos_hospitalizacion.length > 0 && (
              <div>
                <p className="text-sm font-medium text-gray-700 mb-2">Ingresos de Hospitalización:</p>
                <div className="space-y-2">
                  {service.ingresos_hospitalizacion.map((ingreso) => (
                    <div key={ingreso.id_ingreso_hospitalizacion} className="bg-white p-3 rounded border">
                      <div className="flex items-start">
                        <Bed className="h-4 w-4 text-blue-600 mr-2 mt-1" />
                        <div className="flex-1">
                          <p className="text-sm font-medium">Razón de ingreso: {ingreso.razon_ingreso}</p>
                          {ingreso.atenciones_necesarias && (
                            <p className="text-xs text-gray-600">Atenciones: {ingreso.atenciones_necesarias}</p>
                          )}
                          {ingreso.fecha_estimada_alta && (
                            <p className="text-xs text-gray-600">
                              Fecha estimada de alta: {new Date(ingreso.fecha_estimada_alta).toLocaleDateString('es-ES')}
                            </p>
                          )}
                          {ingreso.nro_camas && (
                            <p className="text-xs text-gray-600">Número de camas: {ingreso.nro_camas}</p>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Altas de Hospitalización */}
            {service.altas_hospitalizacion && service.altas_hospitalizacion.length > 0 && (
              <div>
                <p className="text-sm font-medium text-gray-700 mb-2">Altas de Hospitalización:</p>
                <div className="space-y-2">
                  {service.altas_hospitalizacion.map((alta) => (
                    <div key={alta.id_alta_hospitalizacion} className="bg-white p-3 rounded border">
                      <div className="flex items-start">
                        <Bed className="h-4 w-4 text-green-600 mr-2 mt-1" />
                        <div className="flex-1">
                          <p className="text-sm font-medium">Motivo de alta: {alta.motivo_alta}</p>
                          {alta.indicaciones_postalta && (
                            <div className="mt-2 p-2 bg-green-50 rounded">
                              <p className="text-xs font-medium text-green-800">Indicaciones post-alta:</p>
                              <p className="text-xs text-green-700">{alta.indicaciones_postalta}</p>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default MedicalRecords;