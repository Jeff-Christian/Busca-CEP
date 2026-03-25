import { useState, useEffect } from 'react';

function App() {
  const [cep, setCep] = useState('');
  const [endereco, setEndereco] = useState(null);
  const [loading, setLoading] = useState(false);

  const buscarCEP = async (cepLimpo) => {
    try {
      setLoading(true);

      const res = await fetch(`http://localhost:3000/cep/${cepLimpo}`);
      const data = await res.json();

      setEndereco(data);
    } catch (err) {
      console.error(err);
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

  useEffect(() => {
  const cepLimpo = cep.replace(/\D/g, '');

  if (cepLimpo.length === 8) {
    buscarCEP(cepLimpo);
  }
    }, [cep]);

  return (
    <div style={{ padding: 20 }}>
      <h1>Buscar CEP</h1>
      {loading && <p>Buscando CEP...</p>}

      <input
        type="text"
        placeholder="Digite o CEP"
        value={cep}
        onChange={(e) => setCep(formatarCEP(e.target.value))}
      />

      {endereco && !loading && (
        <div style={{ marginTop: 20 }}>
          <p><strong>Rua:</strong> {endereco.logradouro}</p>
          <p><strong>Bairro:</strong> {endereco.bairro}</p>
          <p><strong>Cidade:</strong> {endereco.localidade}</p>
          <p><strong>UF:</strong> {endereco.uf}</p>
        </div>
      )}

    </div>
  );
}

export default App;