import React, { useState, useEffect } from "react";
import { BrowserProvider, JsonRpcProvider, isAddress, formatUnits } from 'ethers';
import "./style.css";

const BalanceChecker = () => {
  const [accounts, setAccounts] = useState([]); // Contas carregadas do backend
  const [balances, setBalances] = useState({}); // Saldos de todas as contas
  const [sortedAccounts, setSortedAccounts] = useState([]); // Contas ordenadas
  const [newAddress, setNewAddress] = useState(''); // Novo endereço manual
  const [copiedAddress, setCopiedAddress] = useState(''); // Endereço copiado
  const [searchTerm, setSearchTerm] = useState(''); // Termo de busca
  const [isConnected, setIsConnected] = useState(false); // Status de conexão
  const [error, setError] = useState(""); // Erros gerais
  const [duplicateAddressError, setDuplicateAddressError] = useState(false); // Endereço duplicado
  const [successMessage, setSuccessMessage] = useState(false); // Mensagem de sucesso ao adicionar

  const apiUrl = 'https://x8ki-letl-twmt.n7.xano.io/api:wHmUZQ0X/tabela'; // API do backend
  const provider = typeof window.ethereum !== 'undefined'
    ? new BrowserProvider(window.ethereum) // Provedor MetaMask
    : new JsonRpcProvider("https://flow-testnet.g.alchemy.com/v2/dRr8neFMosh3bQrQHLKzjyHLUpdeX7bK"); // Provedor Alchemy

  // Função para carregar endereços do backend
  const loadAddressesFromBackend = async () => {
    try {
      const response = await fetch(apiUrl);
      const addresses = await response.json();
      const normalizedAccounts = addresses.map(account => account.address.toLowerCase());
      setAccounts(normalizedAccounts); // Carrega endereços do backend

      // Para cada endereço, obter o saldo
      for (const account of normalizedAccounts) {
        await getBalance(account); // Consultar saldo de cada endereço
      }
    } catch (error) {
      setError("Erro ao carregar endereços do backend");
      console.error(error);
    }
  };

  // Função para consultar o saldo de uma conta Flow
  const getBalance = async (account) => {
    try {
      const balance = await provider.getBalance(account); // Consulta o saldo
      const flowBalance = formatUnits(balance, 18); // Formatação de saldo
      setBalances(prev => ({ ...prev, [account]: parseFloat(flowBalance).toFixed(2) }));
    } catch (error) {
      setError("Erro ao consultar saldo");
      console.error(error);
    }
  };

  // Ordena as contas com base no saldo (da maior para a menor)
  const sortAccountsByBalance = () => {
    const sorted = [...accounts].sort((a, b) => {
      const balanceA = parseFloat(balances[a]) || 0;
      const balanceB = parseFloat(balances[b]) || 0;
      return balanceB - balanceA; // Ordena do maior para o menor
    });
    setSortedAccounts(sorted);
  };

  // Função para conectar ao MetaMask e buscar contas
  const connectMetaMask = async () => {
    try {
      const accountsList = await window.ethereum.request({ method: "eth_requestAccounts" });
      const normalizedAccounts = accountsList.map(account => account.toLowerCase());
      setAccounts(prev => [...new Set([...prev, ...normalizedAccounts])]); // Evita duplicatas
      setIsConnected(true);
      setError("");

      for (const account of normalizedAccounts) {
        await checkAndAddAddress(account); // Adicionar ao backend se necessário
        await getBalance(account); // Consultar saldo
      }
    } catch (error) {
      setError("Erro ao conectar MetaMask");
      console.error(error);
    }
  };

  // Função para verificar e adicionar endereço ao backend
  const checkAndAddAddress = async (address) => {
    try {
      const response = await fetch(apiUrl);
      const addresses = await response.json();
      const addressExists = addresses.some(item => item.address.toLowerCase() === address);

      if (!addressExists) {
        await fetch(apiUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ address })
        });
        console.log(`Endereço ${address} adicionado.`);

        // Exibe a mensagem de sucesso por 3 segundos
        setSuccessMessage(true);
        setTimeout(() => setSuccessMessage(false), 3000);
      } else {
        setDuplicateAddressError(true);
        setTimeout(() => setDuplicateAddressError(false), 3000);
        console.log(`Endereço ${address} já existe.`);
      }
    } catch (error) {
      setError("Erro ao verificar/adicionar endereço no backend");
      console.error(error);
    }
  };

  // Função para adicionar um novo endereço manualmente e enviar para o backend
  const addAddress = async () => {
    const normalizedAddress = newAddress.toLowerCase();
    if (isAddress(normalizedAddress)) {
      if (!accounts.includes(normalizedAddress)) {
        await checkAndAddAddress(normalizedAddress); // Envia para o backend
        setAccounts(prev => [...prev, normalizedAddress]); // Adiciona ao estado local
        getBalance(normalizedAddress); // Consulta o saldo
        setNewAddress(''); // Limpa o input
      } else {
        setDuplicateAddressError(true);
        setTimeout(() => setDuplicateAddressError(false), 3000);
      }
    } else {
      setError("Endereço inválido");
    }
  };

  // Busca e filtra contas
  const filterAccounts = () => {
    return searchTerm === '' ? sortedAccounts : sortedAccounts.filter(account => account.includes(searchTerm.toLowerCase()));
  };

  // Função para copiar o endereço para a área de transferência
  const copyAddressToClipboard = (address) => {
    navigator.clipboard.writeText(address);
    setCopiedAddress(address);
    setTimeout(() => setCopiedAddress(''), 3000);
  };

  // Função para desconectar do MetaMask
  const disconnectMetaMask = () => {
    setAccounts([]); // Limpa as contas
    setBalances({}); // Limpa os saldos
    setIsConnected(false); // Desconecta
    setError("");

    if (window.ethereum) {
      window.ethereum.request({
        method: "wallet_requestPermissions",
        params: [{ eth_accounts: {} }],
      }).then(() => console.log("Desconectado"))
        .catch(error => console.error("Erro ao desconectar MetaMask", error));
    }
  };

  // Função para "sair" e recarregar a página
  const handleExit = () => {
    window.location.reload(); // Recarregar a página
  };

  // Carregar endereços do backend e ordenar ao carregar o componente
  useEffect(() => {
    loadAddressesFromBackend(); // Carregar lista de endereços do backend
  }, []);

  // Ordena os endereços sempre que os saldos são atualizados
  useEffect(() => {
    if (Object.keys(balances).length > 0) {
      sortAccountsByBalance(); // Ordena por saldo sempre que o saldo muda
    }
  }, [balances]);

  return (
    <div className="container">
      <header>
        <h1>Ranking das Baleias 🐳</h1>
      </header>

      <section className="input-section">
        {/* Exibir a busca e adicionar endereço antes da conexão com MetaMask */}
        <div className="add-address">
          <input
            type="text"
            value={newAddress}
            onChange={(e) => setNewAddress(e.target.value)}
            placeholder="Adicionar endereço manualmente" // Texto alterado
          />
          <button onClick={addAddress}>Adicionar</button>
          {/* Botão "Adicionar via MetaMask" */}
          <button onClick={connectMetaMask}>Adicionar via MetaMask</button>
        </div>

        <div className="search-bar">
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar por endereço"
          />
          {/* Botão de Atualizar */}
          <button onClick={loadAddressesFromBackend}>Atualizar</button>
        </div>

        {/* Exibir a tabela de endereços */}
        <table className="account-table">
          <thead>
            <tr>
              <th>#</th> {/* Nova coluna de numeração */}
              <th>Conta</th>
              <th>Saldo (FLOW)</th>
            </tr>
          </thead>
          <tbody>
            {filterAccounts().map((account, index) => (
              <tr key={account}>
                <td>{index + 1}</td> {/* Exibir a numeração de cada conta */}
                <td>
                  <span>{account.slice(0, 6)}...{account.slice(-4)}</span>
                  <span onClick={() => copyAddressToClipboard(account)} className="copy-icon">
                    📋
                  </span>
                  {copiedAddress === account && <span className="copied-message">Copiado!</span>}
                </td>
                <td>{balances[account] || "Carregando..."}</td>
              </tr>
            ))}
          </tbody>
        </table>

        {isConnected && (
          <>
            {duplicateAddressError && (
              <p className="error-message">Endereço já foi adicionado.</p>
            )}
            {successMessage && (
              <p className="success-message">Endereço adicionado com sucesso!</p>
            )}

            <div className="action-buttons">
              <button onClick={disconnectMetaMask}>Desconectar</button>
              <button onClick={handleExit}>Sair</button>
            </div>
          </>
        )}
      </section>

      <footer>
        <p>Powered by Flow Testnet and Alchemy</p>
      </footer>
    </div>
  );
};

export default BalanceChecker;
