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
  AlertCircle,
  RefreshCw,
  User,
  Activity,
  Heart,
  TestTube,
  Scissors,
  Thermometer,
  Bed,
  Home
} from 'lucide-react';

// Interfaces
interface MedicalHistory {
  id: string;
  patientName: string;
  patientId: string;
  lastUpdate: string;
  status: string;
}

interface PatientInfo {
  id: string;
  name: string;
  birthDate: string;
  gender: string;
  bloodType: string;
  allergies: string[];
  dni: string;
  email: string;
  phone: string;
  address: string;
}

interface MedicalService {
  id: string;
  date: string;
  time: string;
  serviceType: string;
  subServiceType: string;
  doctor: string;
  diagnosis?: string;
  symptoms?: string[];
  treatment?: string;
  medications?: Array<{
    name: string;
    dosage: string;
    frequency: string;
  }>;
  examResults?: string;
  observations?: string;
  status?: string;
}

const MedicalRecords: React.FC = () => {
  const { user } = useUser();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRecord, setSelectedRecord] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [records, setRecords] = useState<MedicalHistory[]>([]);
  
  if (!user) return null;

  const fetchMedicalRecords = async () => {
    try {
      setLoading(true);
      setError(null);
      console.log('🔍 Iniciando carga de historias clínicas...');
      console.log('👤 Usuario actual:', user);
      console.log('📋 Perfiles disponibles:', user.profiles);

      const medicalHistories: MedicalHistory[] = [];

      // Obtener historias para cada perfil disponible
      for (const profile of user.profiles) {
        console.log(`📊 Procesando perfil: ${profile.name} (ID: ${profile.id})`);

        try {
          // Buscar historia clínica para esta persona
          const { data: historiaData, error: historiaError } = await supabase
            .from('historia_clinica')
            .select(`
              id_historia,
              fecha_creacion,
              estado_historia_clinica:id_estado (
                nombre_estado
              ),
              perfil_medico:id_perfil_medico (
                fecha_atencion,
                grupo_sanguineo
              )
            `)
            .eq('perfil_medico.id_perfil_medico', profile.id);

          if (historiaError) {
            console.error(`❌ Error obteniendo historia para perfil ${profile.id}:`, historiaError);
            continue;
          }

          console.log(`📋 Historia encontrada para ${profile.name}:`, historiaData);

          if (historiaData && historiaData.length > 0) {
            const historia = historiaData[0];
            
            // Obtener la fecha del último servicio médico
            const { data: lastServiceData } = await supabase
              .from('servicio_medico')
              .select('fecha_servicio')
              .eq('id_cita_medica', historia.id_historia)
              .order('fecha_servicio', { ascending: false })
              .limit(1);

            const lastUpdate = lastServiceData && lastServiceData.length > 0 
              ? new Date(lastServiceData[0].fecha_servicio).toLocaleDateString('es-ES')
              : new Date(historia.fecha_creacion).toLocaleDateString('es-ES');

            medicalHistories.push({
              id: profile.id,
              patientName: profile.name, // ✅ Ahora usa el nombre correcto del perfil
              patientId: profile.id,
              lastUpdate,
              status: historia.estado_historia_clinica?.nombre_estado || 'Activo'
            });
          }
        } catch (profileError) {
          console.error(`❌ Error procesando perfil ${profile.id}:`, profileError);
        }
      }

      console.log('✅ Historias clínicas cargadas:', medicalHistories);
      setRecords(medicalHistories);

    } catch (error) {
      console.error('❌ Error general cargando historias clínicas:', error);
      setError(error instanceof Error ? error.message : 'Error desconocido');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user && user.profiles && user.profiles.length > 0) {
      fetchMedicalRecords();
    } else {
      console.log('⚠️ Usuario sin perfiles disponibles');
      setLoading(false);
    }
  }, [user]);

  // Filter records based on search term
  const filteredRecords = records.filter(record => 
    record.patientName.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Get content based on role
  let content: React.ReactNode = null;
  
  switch (user.currentRole) {
    case 'patient':
      content = <PatientMedicalRecords 
        records={filteredRecords} 
        selectedRecord={selectedRecord} 
        setSelectedRecord={setSelectedRecord}
        loading={loading}
        error={error}
        onRetry={fetchMedicalRecords}
      />;
      break;
    case 'admin':
      content = <AdminMedicalRecords 
        records={filteredRecords}
        loading={loading}
        error={error}
        onRetry={fetchMedicalRecords}
      />;
      break;
    case 'medical':
      content = <MedicalPersonnelRecords 
        records={filteredRecords} 
        selectedRecord={selectedRecord} 
        setSelectedRecord={setSelectedRecord}
        loading={loading}
        error={error}
        onRetry={fetchMedicalRecords}
      />;
      break;
    default:
      content = <PatientMedicalRecords 
        records={filteredRecords} 
        selectedRecord={selectedRecord} 
        setSelectedRecord={setSelectedRecord}
        loading={loading}
        error={error}
        onRetry={fetchMedicalRecords}
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
  records: MedicalHistory[];
  selectedRecord?: string | null;
  setSelectedRecord?: (id: string | null) => void;
  loading: boolean;
  error: string | null;
  onRetry: () => void;
}

const PatientMedicalRecords: React.FC<RecordProps> = ({ 
  records, 
  selectedRecord, 
  setSelectedRecord,
  loading,
  error,
  onRetry
}) => {
  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-sm p-6">
        <div className="flex items-center justify-center py-12">
          <div className="flex flex-col items-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
            <p className="text-gray-600">Cargando historias clínicas...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-lg shadow-sm p-6">
        <div className="flex flex-col items-center justify-center py-12">
          <AlertCircle className="h-12 w-12 text-red-500 mb-4" />
          <h3 className="text-lg font-medium text-gray-800 mb-2">Error al cargar las historias clínicas</h3>
          <p className="text-gray-600 mb-4 text-center">{error}</p>
          <button
            onClick={onRetry}
            className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Reintentar
          </button>
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
                      <p className="text-sm text-gray-600 mt-1">Última actualización: {record.lastUpdate}</p>
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

const AdminMedicalRecords: React.FC<RecordProps> = ({ records, loading, error, onRetry }) => {
  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-sm p-6">
        <div className="flex items-center justify-center py-12">
          <div className="flex flex-col items-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
            <p className="text-gray-600">Cargando historias clínicas...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-lg shadow-sm p-6">
        <div className="flex flex-col items-center justify-center py-12">
          <AlertCircle className="h-12 w-12 text-red-500 mb-4" />
          <h3 className="text-lg font-medium text-gray-800 mb-2">Error al cargar las historias clínicas</h3>
          <p className="text-gray-600 mb-4 text-center">{error}</p>
          <button
            onClick={onRetry}
            className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Reintentar
          </button>
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
                    <span className="px-3 py-1 text-center inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                      Activo
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
  error,
  onRetry
}) => {
  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-sm p-6">
        <div className="flex items-center justify-center py-12">
          <div className="flex flex-col items-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
            <p className="text-gray-600">Cargando historias clínicas...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-lg shadow-sm p-6">
        <div className="flex flex-col items-center justify-center py-12">
          <AlertCircle className="h-12 w-12 text-red-500 mb-4" />
          <h3 className="text-lg font-medium text-gray-800 mb-2">Error al cargar las historias clínicas</h3>
          <p className="text-gray-600 mb-4 text-center">{error}</p>
          <button
            onClick={onRetry}
            className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Reintentar
          </button>
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
                      <p className="text-sm text-gray-600 mt-1">DNI: 40582934 • Última actualización: {record.lastUpdate}</p>
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
  const [patientInfo, setPatientInfo] = useState<PatientInfo | null>(null);
  const [medicalHistory, setMedicalHistory] = useState<MedicalService[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const getServiceIcon = (serviceType: string) => {
    const type = serviceType.toLowerCase();
    if (type.includes('consulta')) return <Stethoscope className="h-5 w-5 text-blue-600" />;
    if (type.includes('examen') || type.includes('análisis') || type.includes('laboratorio')) return <TestTube className="h-5 w-5 text-green-600" />;
    if (type.includes('cirugía') || type.includes('intervención')) return <Scissors className="h-5 w-5 text-red-600" />;
    if (type.includes('terapia')) return <Activity className="h-5 w-5 text-purple-600" />;
    if (type.includes('control')) return <Heart className="h-5 w-5 text-pink-600" />;
    if (type.includes('hospitalización') || type.includes('ingreso')) return <Bed className="h-5 w-5 text-orange-600" />;
    if (type.includes('alta')) return <Home className="h-5 w-5 text-green-600" />;
    return <Clipboard className="h-5 w-5 text-gray-600" />;
  };

  const fetchPatientDetails = async () => {
    try {
      setLoading(true);
      setError(null);
      console.log('🔍 Cargando detalles del paciente:', recordId);

      // Obtener información básica del paciente
      const { data: personaData, error: personaError } = await supabase
        .from('persona')
        .select('*')
        .eq('id_persona', recordId)
        .single();

      if (personaError) throw personaError;

      // Obtener perfil médico
      const { data: perfilData, error: perfilError } = await supabase
        .from('perfil_medico')
        .select(`
          *,
          perfil_alergias (
            alergia (
              nombre_alergia,
              componente_alergeno
            )
          )
        `)
        .eq('id_perfil_medico', recordId)
        .single();

      if (perfilError) console.warn('No se encontró perfil médico:', perfilError);

      // Construir información del paciente
      const patient: PatientInfo = {
        id: recordId,
        name: `${personaData.prenombres} ${personaData.primer_apellido} ${personaData.segundo_apellido}`,
        birthDate: new Date(personaData.fecha_nacimiento).toLocaleDateString('es-ES'),
        gender: personaData.sexo === 'M' ? 'Masculino' : 'Femenino',
        bloodType: perfilData?.grupo_sanguineo || 'No especificado',
        allergies: perfilData?.perfil_alergias?.map((pa: any) => pa.alergia.nombre_alergia) || [],
        dni: personaData.dni_idcarnet,
        email: personaData.correo_electronico || '',
        phone: personaData.numero_celular_personal || '',
        address: personaData.direccion_legal || ''
      };

      setPatientInfo(patient);

      // Obtener servicios médicos
      await fetchMedicalServices(recordId);

    } catch (error) {
      console.error('❌ Error cargando detalles del paciente:', error);
      setError(error instanceof Error ? error.message : 'Error desconocido');
    } finally {
      setLoading(false);
    }
  };

  const fetchMedicalServices = async (patientId: string) => {
    try {
      console.log('🏥 Cargando servicios médicos para paciente:', patientId);

      const services: MedicalService[] = [];

      // 1. Obtener consultas médicas
      const { data: consultasData, error: consultasError } = await supabase
        .from('consulta_medica')
        .select(`
          id_consulta_medica,
          observaciones_generales,
          motivo_consulta,
          servicio_medico!inner (
            id_servicio_medico,
            fecha_servicio,
            hora_inicio_servicio,
            cita_medica!inner (
              paciente!inner (
                id_persona
              ),
              personal_medico (
                persona (
                  prenombres,
                  primer_apellido,
                  segundo_apellido
                )
              )
            )
          ),
          tipo_servicio (
            nombre
          ),
          subtipo_servicio (
            nombre
          )
        `)
        .eq('servicio_medico.cita_medica.paciente.id_persona', patientId);

      if (!consultasError && consultasData) {
        consultasData.forEach((consulta: any) => {
          const servicio = consulta.servicio_medico;
          const doctor = servicio.cita_medica.personal_medico?.persona;
          const doctorName = doctor ? 
            `Dr. ${doctor.prenombres} ${doctor.primer_apellido}` : 
            'Doctor no especificado';

          services.push({
            id: `consulta-${consulta.id_consulta_medica}`,
            date: new Date(servicio.fecha_servicio).toLocaleDateString('es-ES'),
            time: servicio.hora_inicio_servicio,
            serviceType: consulta.tipo_servicio?.nombre || 'Consulta Médica', // ✅ Tipo específico
            subServiceType: consulta.subtipo_servicio?.nombre || '',
            doctor: doctorName,
            diagnosis: consulta.motivo_consulta,
            observations: consulta.observaciones_generales
          });
        });
      }

      // 2. Obtener exámenes
      const { data: examenesData, error: examenesError } = await supabase
        .from('examen')
        .select(`
          id_examen,
          descripcion_procedimiento,
          fecha_hora_atencion,
          descripcion,
          tipo_procedimiento,
          tipo_laboratorio,
          resultado,
          servicio_medico!inner (
            cita_medica!inner (
              paciente!inner (
                id_persona
              ),
              personal_medico (
                persona (
                  prenombres,
                  primer_apellido,
                  segundo_apellido
                )
              )
            )
          )
        `)
        .eq('servicio_medico.cita_medica.paciente.id_persona', patientId);

      if (!examenesError && examenesData) {
        examenesData.forEach((examen: any) => {
          const doctor = examen.servicio_medico.cita_medica.personal_medico?.persona;
          const doctorName = doctor ? 
            `Dr. ${doctor.prenombres} ${doctor.primer_apellido}` : 
            'Laboratorio';

          services.push({
            id: `examen-${examen.id_examen}`,
            date: new Date(examen.fecha_hora_atencion).toLocaleDateString('es-ES'),
            time: new Date(examen.fecha_hora_atencion).toLocaleTimeString('es-ES', { 
              hour: '2-digit', 
              minute: '2-digit' 
            }),
            serviceType: examen.tipo_laboratorio || examen.tipo_procedimiento || 'Examen Médico', // ✅ Tipo específico
            subServiceType: examen.descripcion_procedimiento || '',
            doctor: doctorName,
            examResults: examen.resultado,
            observations: examen.descripcion
          });
        });
      }

      // 3. Obtener terapias
      const { data: terapiasData, error: terapiasError } = await supabase
        .from('terapia')
        .select(`
          id_terapia,
          descripcion,
          observaciones,
          resultados,
          servicio_medico!inner (
            fecha_servicio,
            hora_inicio_servicio,
            cita_medica!inner (
              paciente!inner (
                id_persona
              ),
              personal_medico (
                persona (
                  prenombres,
                  primer_apellido,
                  segundo_apellido
                )
              )
            )
          )
        `)
        .eq('servicio_medico.cita_medica.paciente.id_persona', patientId);

      if (!terapiasError && terapiasData) {
        terapiasData.forEach((terapia: any) => {
          const servicio = terapia.servicio_medico;
          const doctor = servicio.cita_medica.personal_medico?.persona;
          const doctorName = doctor ? 
            `Dr. ${doctor.prenombres} ${doctor.primer_apellido}` : 
            'Terapeuta';

          services.push({
            id: `terapia-${terapia.id_terapia}`,
            date: new Date(servicio.fecha_servicio).toLocaleDateString('es-ES'),
            time: servicio.hora_inicio_servicio,
            serviceType: 'Terapia', // ✅ Tipo específico
            subServiceType: terapia.descripcion || '',
            doctor: doctorName,
            treatment: terapia.resultados,
            observations: terapia.observaciones
          });
        });
      }

      // 4. Obtener intervenciones quirúrgicas
      const { data: cirugiasData, error: cirugiasError } = await supabase
        .from('intervencion_quirurgica')
        .select(`
          id_intervencion,
          procedimiento_quirurgico,
          tipo_anestesia,
          observaciones,
          servicio_medico!inner (
            fecha_servicio,
            hora_inicio_servicio,
            cita_medica!inner (
              paciente!inner (
                id_persona
              ),
              personal_medico (
                persona (
                  prenombres,
                  primer_apellido,
                  segundo_apellido
                )
              )
            )
          )
        `)
        .eq('servicio_medico.cita_medica.paciente.id_persona', patientId);

      if (!cirugiasError && cirugiasData) {
        cirugiasData.forEach((cirugia: any) => {
          const servicio = cirugia.servicio_medico;
          const doctor = servicio.cita_medica.personal_medico?.persona;
          const doctorName = doctor ? 
            `Dr. ${doctor.prenombres} ${doctor.primer_apellido}` : 
            'Cirujano';

          services.push({
            id: `cirugia-${cirugia.id_intervencion}`,
            date: new Date(servicio.fecha_servicio).toLocaleDateString('es-ES'),
            time: servicio.hora_inicio_servicio,
            serviceType: 'Intervención Quirúrgica', // ✅ Tipo específico
            subServiceType: cirugia.procedimiento_quirurgico || '',
            doctor: doctorName,
            observations: `${cirugia.observaciones || ''} ${cirugia.tipo_anestesia ? `(Anestesia: ${cirugia.tipo_anestesia})` : ''}`.trim()
          });
        });
      }

      // 5. Obtener controles
      const { data: controlesData, error: controlesError } = await supabase
        .from('control')
        .select(`
          id_control,
          pulso_cardiaco,
          presion_diastolica,
          presion_sistolica,
          oxigenacion,
          estado_paciente,
          observaciones,
          servicio_medico!inner (
            fecha_servicio,
            hora_inicio_servicio,
            cita_medica!inner (
              paciente!inner (
                id_persona
              ),
              personal_medico (
                persona (
                  prenombres,
                  primer_apellido,
                  segundo_apellido
                )
              )
            )
          )
        `)
        .eq('servicio_medico.cita_medica.paciente.id_persona', patientId);

      if (!controlesError && controlesData) {
        controlesData.forEach((control: any) => {
          const servicio = control.servicio_medico;
          const doctor = servicio.cita_medica.personal_medico?.persona;
          const doctorName = doctor ? 
            `Dr. ${doctor.prenombres} ${doctor.primer_apellido}` : 
            'Personal médico';

          const vitals = [
            `Pulso: ${control.pulso_cardiaco} bpm`,
            `Presión: ${control.presion_sistolica}/${control.presion_diastolica} mmHg`,
            `Oxigenación: ${control.oxigenacion}%`
          ].join(' • ');

          services.push({
            id: `control-${control.id_control}`,
            date: new Date(servicio.fecha_servicio).toLocaleDateString('es-ES'),
            time: servicio.hora_inicio_servicio,
            serviceType: 'Control de Signos Vitales', // ✅ Tipo específico
            subServiceType: vitals,
            doctor: doctorName,
            observations: `Estado: ${control.estado_paciente || 'Normal'}. ${control.observaciones || ''}`.trim()
          });
        });
      }

      // Ordenar servicios por fecha (más recientes primero)
      services.sort((a, b) => {
        const dateA = new Date(a.date.split('/').reverse().join('-'));
        const dateB = new Date(b.date.split('/').reverse().join('-'));
        return dateB.getTime() - dateA.getTime();
      });

      console.log('✅ Servicios médicos cargados:', services);
      setMedicalHistory(services);

    } catch (error) {
      console.error('❌ Error cargando servicios médicos:', error);
    }
  };

  useEffect(() => {
    fetchPatientDetails();
  }, [recordId]);

  if (loading) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-center py-12">
          <div className="flex flex-col items-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
            <p className="text-gray-600">Cargando historia clínica...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error || !patientInfo) {
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
        <div className="flex flex-col items-center justify-center py-12">
          <AlertCircle className="h-12 w-12 text-red-500 mb-4" />
          <h3 className="text-lg font-medium text-gray-800 mb-2">Error al cargar la historia clínica</h3>
          <p className="text-gray-600 mb-4 text-center">{error || 'No se pudo cargar la información del paciente'}</p>
        </div>
      </div>
    );
  }

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
          <h2 className="text-2xl font-semibold text-gray-800">{patientInfo.name}</h2>
          <p className="text-gray-600">Historia Clínica #{patientInfo.id}</p>
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
      
      {/* Patient Information */}
      <div className="bg-gray-50 p-4 rounded-md mb-6">
        <h3 className="text-lg font-medium text-gray-800 mb-3">Información del Paciente</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <p className="text-sm text-gray-500">DNI</p>
            <p className="font-medium">{patientInfo.dni}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">Fecha de Nacimiento</p>
            <p className="font-medium">{patientInfo.birthDate}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">Género</p>
            <p className="font-medium">{patientInfo.gender}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">Grupo Sanguíneo</p>
            <p className="font-medium">{patientInfo.bloodType}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">Teléfono</p>
            <p className="font-medium">{patientInfo.phone || 'No especificado'}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">Email</p>
            <p className="font-medium">{patientInfo.email || 'No especificado'}</p>
          </div>
          <div className="md:col-span-3">
            <p className="text-sm text-gray-500">Dirección</p>
            <p className="font-medium">{patientInfo.address}</p>
          </div>
          {patientInfo.allergies.length > 0 && (
            <div className="md:col-span-3">
              <p className="text-sm text-gray-500">Alergias</p>
              <div className="flex flex-wrap gap-2 mt-1">
                {patientInfo.allergies.map((allergy, index) => (
                  <span 
                    key={index}
                    className="px-2 py-1 bg-red-100 text-red-800 text-xs rounded-full"
                  >
                    {allergy}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
      
      {/* Medical History */}
      <div>
        <h3 className="text-lg font-medium text-gray-800 mb-3">Historial de Servicios Médicos</h3>
        
        {medicalHistory.length > 0 ? (
          <div className="space-y-4">
            {medicalHistory.map((entry) => (
              <div key={entry.id} className="border border-gray-200 rounded-md p-4">
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <div className="flex items-center">
                      {getServiceIcon(entry.serviceType)}
                      <h4 className="font-medium text-gray-800 ml-2">{entry.serviceType}</h4>
                    </div>
                    {entry.subServiceType && (
                      <p className="text-sm text-gray-600 mt-1 ml-7">{entry.subServiceType}</p>
                    )}
                    <div className="flex items-center mt-1 text-sm text-gray-600 ml-7">
                      <Calendar className="h-4 w-4 mr-1" />
                      {entry.date} • {entry.time}
                    </div>
                  </div>
                  <div className="text-sm text-gray-600">
                    {entry.doctor}
                  </div>
                </div>
                
                {entry.diagnosis && (
                  <div className="mt-3 ml-7">
                    <p className="text-sm font-medium">Diagnóstico/Motivo:</p>
                    <p className="text-sm">{entry.diagnosis}</p>
                  </div>
                )}
                
                {entry.symptoms && entry.symptoms.length > 0 && (
                  <div className="mt-2 ml-7">
                    <p className="text-sm font-medium">Síntomas:</p>
                    <ul className="text-sm list-disc list-inside">
                      {entry.symptoms.map((symptom, index) => (
                        <li key={index}>{symptom}</li>
                      ))}
                    </ul>
                  </div>
                )}
                
                {entry.treatment && (
                  <div className="mt-2 ml-7">
                    <p className="text-sm font-medium">Tratamiento:</p>
                    <div className="flex items-start mt-1">
                      <Pill className="h-4 w-4 mr-2 mt-1 text-purple-600" />
                      <p className="text-sm">{entry.treatment}</p>
                    </div>
                  </div>
                )}

                {entry.examResults && (
                  <div className="mt-2 ml-7">
                    <p className="text-sm font-medium">Resultados:</p>
                    <p className="text-sm">{entry.examResults}</p>
                  </div>
                )}

                {entry.observations && (
                  <div className="mt-2 ml-7">
                    <p className="text-sm font-medium">Observaciones:</p>
                    <p className="text-sm">{entry.observations}</p>
                  </div>
                )}

                {entry.medications && entry.medications.length > 0 && (
                  <div className="mt-2 ml-7">
                    <p className="text-sm font-medium">Medicamentos:</p>
                    <div className="space-y-1">
                      {entry.medications.map((med, index) => (
                        <div key={index} className="flex items-center text-sm">
                          <Pill className="h-3 w-3 mr-2 text-purple-600" />
                          <span>{med.name} - {med.dosage} - {med.frequency}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-gray-500">
            <Clipboard className="h-12 w-12 mx-auto text-gray-400 mb-2" />
            <p>No hay servicios médicos registrados</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default MedicalRecords;