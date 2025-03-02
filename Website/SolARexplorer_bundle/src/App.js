import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import Repository from './components/Repository';
import { listRepositories } from './utils/solanaUtils';
import { WalletProvider } from './contexts/WalletContext';
import './App.css';

function App() {
  const [searchAddress, setSearchAddress] = useState('');
  const [repositories, setRepositories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState(null);

  useEffect(() => {
    async function fetchRepositories() {
      try {
        setLoading(true);
        const result = await listRepositories({}, page, 10);
        setRepositories(result.repositories);
        setPagination(result.pagination);
        setLoading(false);
      } catch (error) {
        console.error("Failed to fetch repositories:", error);
        setLoading(false);
      }
    }

    fetchRepositories();
  }, [page]);

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!searchAddress) return;
    
    try {
      // First check if input is an address format
      if (searchAddress.startsWith('0x') || searchAddress.length > 30) {
        window.location.href = `/repository/${searchAddress}`;
        return;
      }
      
      // Otherwise try to search by name
      setLoading(true);
      const result = await listRepositories({ name: searchAddress }, 1, 10);
      
      if (result.repositories && result.repositories.length > 0) {
        // Found repositories by name, update the list
        setRepositories(result.repositories);
        setPagination(result.pagination);
        setPage(1);
      } else {
        // No results, treat as address
        window.location.href = `/repository/${searchAddress}`;
      }
      
      setLoading(false);
    } catch (error) {
      console.error("Search failed:", error);
      // If search fails, try as direct address
      window.location.href = `/repository/${searchAddress}`;
    }
  };

  const handleCopyAddress = (e, address) => {
    e.preventDefault(); // Prevent navigation
    navigator.clipboard.writeText(address);
  };

  return (
    <WalletProvider>
      <Router>
        <div className="app">
          <header className="header">
            <Link to="/" className="logo-link">
              <h1>SolAR Explorer</h1>
            </Link>
            <form className="search-container" onSubmit={handleSearch}>
              <input
                type="text"
                placeholder="Search by repository address..."
                value={searchAddress}
                onChange={(e) => setSearchAddress(e.target.value)}
              />
              <button type="submit" className="search-icon-btn">🔍</button>
            </form>
          </header>

        <main>
          <Routes>
            <Route path="/" element={
              <section className="recent-repositories">
                <h2>Recent Repositories</h2>
                {loading ? (
                  <div className="loading">Loading repositories...</div>
                ) : (
                  <>
                    <div className="repository-grid">
                      {repositories.map((repo, index) => (
                        <Link
                          to={`/repository/${repo.address}`}
                          key={index}
                          className="repository-card"
                        >
                          <h3>{repo.name}</h3>
                          <div className="repo-stats">
                            <span className="star-count">⭐ {repo.stars}</span>
                            <span className="branch-count">🔱 {repo.branches.length}</span>
                          </div>
                          <button
                            className="copy-address"
                            onClick={(e) => handleCopyAddress(e, repo.address)}
                          >
                            {repo.address}
                          </button>
                        </Link>
                      ))}
                    </div>
                    
                    {pagination && pagination.pages > 1 && (
                      <div className="pagination">
                        <button 
                          onClick={() => setPage(p => Math.max(1, p - 1))}
                          disabled={page === 1}
                          className="pagination-btn"
                        >
                          Previous
                        </button>
                        <span className="page-info">
                          Page {page} of {pagination.pages}
                        </span>
                        <button 
                          onClick={() => setPage(p => Math.min(pagination.pages, p + 1))}
                          disabled={page === pagination.pages}
                          className="pagination-btn"
                        >
                          Next
                        </button>
                      </div>
                    )}
                  </>
                )}
              </section>
            } />
            <Route path="/repository/:address" element={<Repository />} />
          </Routes>
        </main>
      </div>
    </Router>
    </WalletProvider>
  );
}

export default App;