import { useState, useEffect } from 'react';
import './App.css';
import logo from './assets/MsConnectLogo.png';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';

function App() {
  const [cep, setCep] = useState('');
  const [endereco, setEndereco] = useState(null);
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState('');

  // histórico
  const [selecionado, setSelecionado] = useState(null);
  const [historico, setHistorico] = useState([]);
  const [copiado, setCopiado] = useState(false);

  const buscarCEP = async (cepLimpo) => {
    try {
      setLoading(true);
      setErro('');

      const res = await fetch(`http://localhost:3000/cep/${cepLimpo}`);
      const data = await res.json();

      if (data.erro) {
        setErro('CEP não encontrado. Verifique e tente novamente.');
        setEndereco(null);
        return;
      }

      setEndereco(data);

      setHistorico((prev) => {
        const novo = [data, ...prev];

        const filtrado = novo.filter(
          (item, index, self) =>
            index === self.findIndex((i) => i.cep === item.cep)
        );

        const limitado = filtrado.slice(0, 5);

        localStorage.setItem('historicoCep', JSON.stringify(limitado));

        return limitado;
      });

    } catch (err) {
      setErro('Erro ao buscar CEP 🚨');
      setEndereco(null);
    } finally {
      setLoading(false);
    }
  };

  const formatarCEP = (valor) => {
    valor = valor.replace(/\D/g, ''); // remove tudo que não é número

    if (valor.length > 5) {
      valor = valor.slice(0, 5) + '-' + valor.slice(5, 8);
    }

    return valor.slice(0, 9);
  };

  const normalizarRua = (rua) => {
    return rua
      .toLowerCase()
      .replace(/\b(avenida|av\.?|rua|r\.?|estrada|rodovia|travessa|tv\.?|praça|praca)\b/g, '')
      .replace(/\s+/g, ' ')
      .trim();
  };

  const copiarEndereco = () => {
    const texto = `
  ${endereco.logradouro}
  ${endereco.bairro}
  ${endereco.localidade} - ${endereco.uf}
    `;

    navigator.clipboard.writeText(texto);

    setCopiado(true);

    setTimeout(() => {
      setCopiado(false);
    }, 2000);
  };

  useEffect(() => {
    const dados = localStorage.getItem('historicoCep');

    if (dados) {
      setHistorico(JSON.parse(dados));
    }
  }, []);

  
  // trabalhar no metódo de buscar endereço
  const [modoBusca, setModoBusca] = useState("cep"); 
  // "cep" ou "endereco"
  const [rua, setRua] = useState('');
  const [cidade, setCidade] = useState('');
  const [uf, setUf] = useState('');

  const buscarEndereco = async () => {
    try {
      setLoading(true);
      setErro('');

      const res = await fetch(
        `https://viacep.com.br/ws/${uf}/${cidade}/${rua}/json/`
      );

      const data = await res.json();

      if (!data || data.length === 0) {
        setErro('Endereço não encontrado.');
        setEndereco(null);
        return;
      }

      const resultado = data[0];

      if (!resultado.cep) {
        setErro('CEP não encontrado para esse endereço.');
        setEndereco(null);
        return;
      }

      setEndereco(resultado);

    } catch (err) {
      setErro('Erro ao buscar endereço 🚨');
      setEndereco(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (endereco && modoBusca === "endereco") {
      setCep(endereco.cep);
    }
  }, [endereco]);

  useEffect(() => {
    if (endereco && modoBusca === "cep") {
      setRua(endereco.logradouro);
      setCidade(endereco.localidade);
      setUf(endereco.uf);
    }
  }, [endereco]);

  useEffect(() => {
    const timeout = setTimeout(() => {
      if (modoBusca === "cep") {
        const cepLimpo = cep.replace(/\D/g, '');
        if (cepLimpo.length === 8) {
          buscarCEP(cepLimpo);
        }
      }

      if (modoBusca === "endereco") {
        if (rua.length > 3 && cidade.length > 3 && uf.length === 2) {
          buscarEndereco();
        }
      }
    }, 500);

    return () => clearTimeout(timeout);
  }, [cep, rua, cidade, uf, modoBusca]);

  // limpar histórico
  const limparHistorico = () => {
    const confirmar = window.confirm("Deseja realmente limpar o histórico?");

    if (!confirmar) return;

    localStorage.removeItem('historicoCep');
    setHistorico([]);
  };

  // Reutilizar histórico
  const selecionarHistorico = (item) => {
    setErro('');
    setEndereco(item);
    setSelecionado(item.cep); // 🔥 ESSENCIAL

    if (modoBusca === "cep") {
      setCep(item.cep);
    } else {
      setRua(item.logradouro || "");
      setCidade(item.localidade || "");
      setUf(item.uf || "");
    }
  };

  // função de GeoCode

    const [coords, setCoords] = useState(null);

    const buscarCoordenadas = async () => {
      if (!endereco) return;

      const query = `${endereco.logradouro}, ${endereco.localidade}, ${endereco.uf}`;

      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}`
      );

      const data = await res.json();

      if (data.length > 0) {
        return {
          lat: data[0].lat,
          lon: data[0].lon,
        };
      }
    };

    useEffect(() => {
      const carregarCoords = async () => {
        const resultado = await buscarCoordenadas();
        setCoords(resultado);
      };

      if (endereco) {
        carregarCoords();
      }
    }, [endereco]);

    function FlyToLocation({ coords, endereco }) {
      const map = useMap();

      useEffect(() => {
        if (coords && endereco) {
          const lat = parseFloat(coords.lat);
          const lon = parseFloat(coords.lon);

          const getZoomLevel = (endereco) => {
            if (!endereco.logradouro) return 12;
            if (!endereco.bairro) return 14;
            return 16;
          };

          map.flyTo([lat, lon], getZoomLevel(endereco), {
            duration: 1.5,
          });
        }
      }, [coords, endereco]);

      return null;
    }


  return (
  <div className="container">
    
    {/* HEADER */}
    <header className="header">
      <img src={logo} alt="logo ms connect" />
      <h1>BUSCA CEP</h1>

      <div className="toggle">
        <button
          className={modoBusca === "cep" ? "ativo" : ""}
          onClick={() => setModoBusca("cep")}
        >
          CEP
        </button>
        <button
          className={modoBusca === "endereco" ? "ativo" : ""}
          onClick={() => setModoBusca("endereco")}
        >
          Endereço
        </button>
      </div>

      {/* INPUT DINÂMICO */}
      {modoBusca === "cep" ? (
        <input
          type="text"
          placeholder="Digite o CEP..."
          value={cep}
          onChange={(e) => setCep(formatarCEP(e.target.value))}
        />
      ) : (
        <div className="inputs-endereco">
          <input
            type="text"
            placeholder="Rua"
            value={rua}
            onChange={(e) => setRua(e.target.value)}
          />
          <input
            type="text"
            placeholder="Cidade"
            value={cidade}
            onChange={(e) => setCidade(e.target.value)}
          />
          <input
            type="text"
            placeholder="UF"
            value={uf}
            onChange={(e) => setUf(e.target.value)}
          />
        </div>
      )}
    </header>

    {/* CONTEÚDO */}
    <div className="content">

      {/* RESULTADO */}

      <div className="card">
        <div className="card-header">
          <h2>Resultado</h2>

          {endereco && (
            <button
              onClick={copiarEndereco}
              className={copiado ? "copiado" : ""}
            >
              {copiado ? "Copiado!" : "Copiar endereço"}
            </button>
          )}
        </div>

        <div className="card-body">
          {loading && <div className="spinner" />}          
          {erro && <p className="erro">{erro}</p>}

          {endereco && (
            <>
              <div className="info-item">
                <span>CEP</span>
                <p>{endereco.cep}</p>
              </div>

              <div className="info-item">
                <span>Rua</span>
                <p>{endereco.logradouro}</p>
              </div>

              <div className="info-item">
                <span>Bairro</span>
                <p>{endereco.bairro}</p>
              </div>

              <div className="info-item">
                <span>Cidade</span>
                <p>{endereco.localidade}</p>
              </div>

              <div className="info-item">
                <span>UF</span>
                <p>{endereco.uf}</p>
              </div>
            </>
          )}
        </div>
      </div>

      {/* HISTÓRICO */}
      <div className="card">
              <div className="card-header">
        <h2>Histórico</h2>

        {historico.length > 0 && (
          <button onClick={limparHistorico} className="btn-limpar">
            Limpar
          </button>
        )}
      </div>

        <div className="card-body">
          {historico.map((item, index) => (
            <div
              key={item.cep}
              className={`historico-item ${
                selecionado === item.cep ? "ativo" : ""
              }`}
              onClick={() => selecionarHistorico(item)}
            >
              <p><strong>Rua:</strong> {item.logradouro}</p>
              <p><strong>Bairro:</strong> {item.bairro}</p>
              <p><strong>Cidade:</strong> {item.localidade}</p>
              <p><strong>UF:</strong> {item.uf}</p>
              <p><strong>CEP:</strong> {item.cep}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
    
      {/* MAPA */}
      <MapContainer center={[-23.55, -46.63]} zoom={13}>
        <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />

        {coords && (
          <>
            <Marker position={[coords.lat, coords.lon]}>
              <Popup>
                {endereco?.logradouro} <br />
                {endereco?.cep}
              </Popup>
            </Marker>

            <FlyToLocation coords={coords} />
          </>
        )}
      </MapContainer>
  </div>
);
}

export default App;