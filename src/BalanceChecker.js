import React, { useState, useEffect } from "react";
import { BrowserProvider, JsonRpcProvider, isAddress, formatUnits } from 'ethers'; 
import "./style.css"; // Seu estilo existente

const BalanceChecker = () => {
  const [accounts, setAccounts] = useState([]); // Contas conectadas
  const [balances, setBalances] = useState({}); // Saldos de todas as contas
  const [sortedAccounts, setSortedAccounts] = useState([]); // Contas ordenadas
  const [sortDirection, setSortDirection] = useState('desc'); // Direção da ordenação
  const [newAddress, setNewAddress] = useState(''); // Novo endereço manual
  const [copiedAddress, setCopiedAddress] = useState(''); // Endereço copiado
  const [searchTerm, setSearchTerm] = useState(''); // Termo de busca
  const [isConnected, setIsConnected] = useState(false); // Status de conexão
  const [error, setError] = useState(""); // Erros gerais
  const [duplicateAddressError, setDuplicateAddressError] = useState(false); // Endereço duplicado

  const apiUrl = 'https://x8ki-letl-twmt.n7.xano.io/api:wHmUZQ0X/tabela'; // API do banco de dados
  const provider = typeof window.ethereum !== 'undefined'
    ? new BrowserProvider(window.ethereum) // Provedor MetaMask
    : new JsonRpcProvider("https://flow-testnet.g.alchemy.com/v2/dRr8neFMosh3bQrQHLKzjyHLUpdeX7bK"); // Provedor Alchemy

  // Função para conectar ao MetaMask e buscar contas
  const connectMetaMask = async () => {
    try {
      const accountsList = await window.ethereum.request({ method: "eth_requestAccounts" });
      const normalizedAccounts = accountsList.map(account => account.toLowerCase());
      setAccounts(prev => [...new Set([...prev, ...normalizedAccounts])]); // Evita duplicatas
      setIsConnected(true);
      setError("");

      for (const account of normalizedAccounts) {
        await checkAndAddAddress(account); // Adicionar ao banco de dados se necessário
        getBalance(account); // Consultar saldo
      }
    } catch (error) {
      setError("Erro ao conectar MetaMask");
      console.error(error);
    }
  };

  // Função para verificar e adicionar endereço ao banco de dados
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
      } else {
        setDuplicateAddressError(true);
        setTimeout(() => setDuplicateAddressError(false), 3000);
        console.log(`Endereço ${address} já existe.`);
      }
    } catch (error) {
      setError("Erro ao verificar/adicionar endereço");
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

  // Ordena as contas com base no saldo
  const sortAccounts = () => {
    const sorted = [...accounts].sort((a, b) => {
      const balanceA = parseFloat(balances[a]) || 0;
      const balanceB = parseFloat(balances[b]) || 0;
      return sortDirection === 'desc' ? balanceB - balanceA : balanceA - balanceB;
    });
    setSortedAccounts(sorted);
    setSortDirection(sortDirection === 'desc' ? 'asc' : 'desc'); // Alterna a direção
  };

  // Busca e filtra contas
  const filterAccounts = () => {
    return searchTerm === '' ? sortedAccounts : sortedAccounts.filter(account => account.includes(searchTerm.toLowerCase()));
  };

  // Adiciona um novo endereço manualmente
  const addAddress = () => {
    const normalizedAddress = newAddress.toLowerCase();
    if (isAddress(normalizedAddress)) {
      if (!accounts.includes(normalizedAddress)) {
        setAccounts(prev => [...prev, normalizedAddress]);
        getBalance(normalizedAddress);
        setNewAddress(''); // Limpa o input
      } else {
        setDuplicateAddressError(true);
        setTimeout(() => setDuplicateAddressError(false), 3000);
      }
    } else {
      setError("Endereço inválido");
    }
  };

  // Remove um endereço da lista
  const removeAddress = (addressToRemove) => {
    setAccounts(prev => prev.filter(account => account !== addressToRemove));
    setSortedAccounts(prev => prev.filter(account => account !== addressToRemove));
    setBalances(prev => {
      const updatedBalances = { ...prev };
      delete updatedBalances[addressToRemove];
      return updatedBalances;
    });
  };

  // Copia o endereço para a área de transferência
  const copyAddressToClipboard = (address) => {
    navigator.clipboard.writeText(address);
    setCopiedAddress(address);
    setTimeout(() => setCopiedAddress(''), 3000);
  };

  // Função para desconectar do MetaMask
  const disconnectMetaMask = () => {
    setAccounts([]); // Limpa as contas
    setBalances({}); // Limpa os saldos
    setSortedAccounts([]); // Limpa as contas ordenadas
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

  useEffect(() => {
    setSortedAccounts([...accounts]); // Atualiza a lista ordenada sempre que as contas ou saldos mudam
  }, [accounts, balances]);

  return (
    <div className="container">
      <header>
        <h1>Ranking das Baleias 🐳</h1>
      </header>

      <section className="input-section">
        {!isConnected ? (
          <button onClick={connectMetaMask}>Ver Saldo</button>
        ) : (
          <>
            {duplicateAddressError && (
              <p className="error-message">Endereço já foi adicionado.</p>
            )}

            <div className="action-buttons">
              <button onClick={sortAccounts}>Ordenar</button>
              <button onClick={disconnectMetaMask}>Desconectar</button>
            </div>

            <div className="add-address">
              <input
                type="text"
                value={newAddress}
                onChange={(e) => setNewAddress(e.target.value)}
                placeholder="Adicionar endereço"
              />
              <button onClick={addAddress}>Adicionar</button>
            </div>

            <div className="search-bar">
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Buscar por endereço"
              />
            </div>

            <table className="account-table">
              <thead>
                <tr>
                  <th>Conta</th>
                  <th>Saldo (FLOW)</th>
                  <th>Ações</th>
                </tr>
              </thead>
              <tbody>
                {filterAccounts().map((account) => (
                  <tr key={account}>
                    <td>
                      <span>{account.slice(0, 6)}...{account.slice(-4)}</span>
                      <span onClick={() => copyAddressToClipboard(account)} className="copy-icon">
                        📋
                      </span>
                      {copiedAddress === account && <span className="copied-message">Copiado!</span>}
                    </td>
                    <td>{balances[account] || "Carregando..."}</td>
                    <td>
                      <button onClick={() => removeAddress(account)} className="remove-button">Remover</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
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
