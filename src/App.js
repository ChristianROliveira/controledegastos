import React, { useState, useEffect, useRef } from "react";
import Chart from "chart.js/auto";

const meses = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
const coresCategoria = ["#4e79a7", "#f28e2b", "#e15759", "#76b7b2", "#59a14f", "#edc949", "#af7aa1", "#ff9da7", "#9c755f", "#bab0ab"];

export default function App() {
  // --------- LOGIN ---------
  const [logado, setLogado] = useState(() => localStorage.getItem("logado") === "true");
  const [usuarioInput, setUsuarioInput] = useState("");
  const [senhaInput, setSenhaInput] = useState("");
  const usuarioCorreto = "admin";
  const senhaCorreta = "123456";

  // --------- APP FINANCEIRO ---------
  const [pagina, setPagina] = useState("resumo");
  const [transacoes, setTransacoes] = useState(() => {
    const saved = localStorage.getItem("transacoes");
    return saved ? JSON.parse(saved) : [];
  });
  const [categorias, setCategorias] = useState(() => {
    const saved = localStorage.getItem("categorias");
    return saved ? JSON.parse(saved) : ["Salário", "Alimentação", "Transporte", "Lazer", "Saúde", "Educação"];
  });

  // Entrada
  const [descricaoEnt, setDescricaoEnt] = useState("");
  const [valorEnt, setValorEnt] = useState("");
  const [categoriaEnt, setCategoriaEnt] = useState(categorias[0] || "");
  const [mesEnt, setMesEnt] = useState(meses[new Date().getMonth()]);
  const [recorrenteEnt, setRecorrenteEnt] = useState(false);
  const [novaCatEnt, setNovaCatEnt] = useState("");

  // Saída
  const [descricaoSai, setDescricaoSai] = useState("");
  const [valorSai, setValorSai] = useState("");
  const [categoriaSai, setCategoriaSai] = useState(categorias[0] || "");
  const [mesSai, setMesSai] = useState(meses[new Date().getMonth()]);
  const [parcelasSai, setParcelasSai] = useState(1);
  const [novaCatSai, setNovaCatSai] = useState("");

  // Filtros resumo
  const [mesFiltro, setMesFiltro] = useState(meses[new Date().getMonth()]);
  const [anoFiltro, setAnoFiltro] = useState(new Date().getFullYear());

  // Edição
  const [editando, setEditando] = useState(null);
  const [editDados, setEditDados] = useState({ descricao: "", valor: "", categoria: "", mes: "", ano: "", tipo: "" });

  // Gráficos
  const chartPizzaEntradas = useRef(null);
  const chartPizzaSaidas = useRef(null);
  const pizzaEntradasInst = useRef(null);
  const pizzaSaidasInst = useRef(null);

  // Persistência
  useEffect(() => {
    localStorage.setItem("transacoes", JSON.stringify(transacoes));
  }, [transacoes]);
  useEffect(() => {
    localStorage.setItem("categorias", JSON.stringify(categorias));
  }, [categorias]);

  // Atualiza gráficos
  useEffect(() => {
    if (pagina === "resumo" && chartPizzaEntradas.current && chartPizzaSaidas.current) {
      atualizarGraficosResumo();
    }
  }, [pagina, transacoes, mesFiltro, anoFiltro]);

  // Função para atualizar gráficos
  const atualizarGraficosResumo = () => {
    if (!chartPizzaEntradas.current || !chartPizzaSaidas.current) return;
    const transFiltradas = transacoes.filter(t => t.mes === mesFiltro && t.ano === anoFiltro);
    const somaPorCategoriaEntrada = {};
    const somaPorCategoriaSaida = {};
    transFiltradas.forEach(t => {
      if (t.tipo === "entrada") somaPorCategoriaEntrada[t.categoria] = (somaPorCategoriaEntrada[t.categoria] || 0) + t.valor;
      else somaPorCategoriaSaida[t.categoria] = (somaPorCategoriaSaida[t.categoria] || 0) + t.valor;
    });

    const criarPizza = (ctx, dados, instanciaRef) => {
      if (instanciaRef.current) instanciaRef.current.destroy();
      if (Object.keys(dados).length === 0) {
        instanciaRef.current = new Chart(ctx, {
          type: "pie",
          data: { labels: ["Sem dados"], datasets: [{ data: [1], backgroundColor: ["#555"] }] },
          options: { plugins: { legend: { position: "bottom", labels: { color: "#eee" } } } }
        });
        return;
      }
      const labels = Object.keys(dados);
      const bgColors = labels.map((_, i) => coresCategoria[i % coresCategoria.length]);
      instanciaRef.current = new Chart(ctx, {
        type: "pie",
        data: {
          labels,
          datasets: [{ data: Object.values(dados).map(v => +v.toFixed(2)), backgroundColor: bgColors }]
        },
        options: {
          plugins: { legend: { position: "bottom", labels: { color: "#eee" } } },
          responsive: true,
          maintainAspectRatio: false
        }
      });
    };

    criarPizza(chartPizzaEntradas.current.getContext("2d"), somaPorCategoriaEntrada, pizzaEntradasInst);
    criarPizza(chartPizzaSaidas.current.getContext("2d"), somaPorCategoriaSaida, pizzaSaidasInst);
  };

  // Calcula saldo
  const calcularSaldo = (mesAtual, anoAtual) => {
    const entradas = transacoes
      .filter(t => t.mes === mesAtual && t.ano === anoAtual && t.tipo === "entrada")
      .reduce((acc, cur) => acc + cur.valor, 0);
    const saidas = transacoes
      .filter(t => t.mes === mesAtual && t.ano === anoAtual && t.tipo === "saida")
      .reduce((acc, cur) => acc + cur.valor, 0);
    return entradas - saidas;
  };

  // Adiciona categoria
  const adicionarCategoria = (novaCat, setNovaCat, setCategoria) => {
    const catTrim = novaCat.trim();
    if (!catTrim) return;
    if (categorias.includes(catTrim)) {
      alert("Categoria já existe!");
      return;
    }
    const novas = [...categorias, catTrim];
    setCategorias(novas);
    setCategoria(catTrim);
    setNovaCat("");
  };

  // Adiciona entrada
  const adicionarEntrada = e => {
    e.preventDefault();
    const valNum = parseFloat(valorEnt);
    if (!descricaoEnt || !categoriaEnt || isNaN(valNum) || valNum <= 0) {
      alert("Preencha os campos corretamente na entrada!");
      return;
    }
    const novas = [...transacoes];
    if (recorrenteEnt) {
      const mesBaseIndex = meses.indexOf(mesEnt);
      const anoBase = new Date().getFullYear();
      for (let i = 0; i < 12; i++) {
        const mesIndex = (mesBaseIndex + i) % 12;
        const ano = anoBase + Math.floor((mesBaseIndex + i) / 12);
        novas.push({
          descricao: descricaoEnt + " (recorrente)",
          valor: valNum,
          categoria: categoriaEnt,
          mes: meses[mesIndex],
          ano,
          tipo: "entrada",
          id: Date.now() + i
        });
      }
    } else {
      novas.push({
        descricao: descricaoEnt,
        valor: valNum,
        categoria: categoriaEnt,
        mes: mesEnt,
        ano: new Date().getFullYear(),
        tipo: "entrada",
        id: Date.now()
      });
    }
    setTransacoes(novas);
    setDescricaoEnt("");
    setValorEnt("");
    setCategoriaEnt(categorias[0] || "");
    setMesEnt(meses[new Date().getMonth()]);
    setRecorrenteEnt(false);
    setPagina("resumo");
  };

  // Adiciona saída
  const adicionarSaida = e => {
    e.preventDefault();
    const valNum = parseFloat(valorSai);
    const parcelasNum = parseInt(parcelasSai);
    if (!descricaoSai || !categoriaSai || isNaN(valNum) || valNum <= 0 || isNaN(parcelasNum) || parcelasNum < 1) {
      alert("Preencha os campos corretamente na saída!");
      return;
    }
    const novas = [...transacoes];
    const mesBaseIndex = meses.indexOf(mesSai);
    const anoBase = new Date().getFullYear();
    for (let i = 0; i < parcelasNum; i++) {
      const mesIndex = (mesBaseIndex + i) % 12;
      const ano = anoBase + Math.floor((mesBaseIndex + i) / 12);
      novas.push({
        descricao: descricaoSai + (parcelasNum > 1 ? ` (parcela ${i + 1}/${parcelasNum})` : ""),
        valor: valNum,
        categoria: categoriaSai,
        mes: meses[mesIndex],
        ano,
        tipo: "saida",
        id: Date.now() + i
      });
    }
    setTransacoes(novas);
    setDescricaoSai("");
    setValorSai("");
    setCategoriaSai(categorias[0] || "");
    setMesSai(meses[new Date().getMonth()]);
    setParcelasSai(1);
    setPagina("resumo");
  };

  // Edição
  const iniciarEdicao = trans => {
    setEditando(trans.id);
    setEditDados({
      descricao: trans.descricao,
      valor: trans.valor,
      categoria: trans.categoria,
      mes: trans.mes,
      ano: trans.ano,
      tipo: trans.tipo
    });
  };

  const cancelarEdicao = () => {
    setEditando(null);
    setEditDados({ descricao: "", valor: "", categoria: "", mes: "", ano: "", tipo: "" });
  };

  const salvarEdicao = () => {
    const valNum = parseFloat(editDados.valor);
    if (
      !editDados.descricao ||
      !editDados.categoria ||
      isNaN(valNum) ||
      valNum <= 0 ||
      !meses.includes(editDados.mes) ||
      isNaN(editDados.ano)
    ) {
      alert("Preencha os campos corretamente na edição!");
      return;
    }
    const novas = transacoes.map(t => {
      if (t.id === editando) {
        return {
          ...t,
          descricao: editDados.descricao,
          valor: valNum,
          categoria: editDados.categoria,
          mes: editDados.mes,
          ano: Number(editDados.ano),
          tipo: editDados.tipo
        };
      }
      return t;
    });
    setTransacoes(novas);
    cancelarEdicao();
  };

  // Excluir transação
  const excluirTransacao = id => {
    const transacao = transacoes.find(t => t.id === id);
    if (!transacao) return;
    const confirmacao = window.confirm("Excluir todas as parcelas/recorrências? OK = todas, Cancelar = só esta.");
    let novas;
    if (confirmacao) {
      const descricaoBase = transacao.descricao.split(" (")[0];
      novas = transacoes.filter(t => !t.descricao.startsWith(descricaoBase));
    } else {
      novas = transacoes.filter(t => t.id !== id);
    }
    setTransacoes(novas);
  };

  // Login handlers
  const handleLogin = e => {
    e.preventDefault();
    if (usuarioInput === usuarioCorreto && senhaInput === senhaCorreta) {
      setLogado(true);
      localStorage.setItem("logado", "true");
      setUsuarioInput("");
      setSenhaInput("");
    } else {
      alert("Usuário ou senha incorretos!");
    }
  };

  const handleLogout = () => {
    setLogado(false);
    localStorage.removeItem("logado");
  };

  // --------- RENDER LOGIN ---------
  if (!logado) {
    return (
      <div style={{
        backgroundColor: "#121212",
        color: "#eee",
        height: "100vh",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        fontFamily: "Arial, sans-serif",
        padding: 20
      }}>
        <form onSubmit={handleLogin} style={{
          backgroundColor: "#1e1e1e",
          padding: 30,
          borderRadius: 8,
          boxShadow: "0 0 10px #000",
          width: "100%",
          maxWidth: 400
        }}>
          <h2 style={{ marginBottom: 20, textAlign: "center" }}>Login</h2>
          <div style={{ marginBottom: 15 }}>
            <label>Usuário</label><br />
            <input
              type="text"
              value={usuarioInput}
              onChange={e => setUsuarioInput(e.target.value)}
              required
              style={{
                width: "100%",
                padding: 8,
                borderRadius: 4,
                border: "1px solid #333",
                backgroundColor: "#222",
                color: "#eee"
              }}
              autoFocus
            />
          </div>
          <div style={{ marginBottom: 20 }}>
            <label>Senha</label><br />
            <input
              type="password"
              value={senhaInput}
              onChange={e => setSenhaInput(e.target.value)}
              required
              style={{
                width: "100%",
                padding: 8,
                borderRadius: 4,
                border: "1px solid #333",
                backgroundColor: "#222",
                color: "#eee"
              }}
            />
          </div>
          <button type="submit" style={{
            width: "100%",
            padding: 10,
            backgroundColor: "#4e79a7",
            border: "none",
            borderRadius: 4,
            color: "#fff",
            cursor: "pointer"
          }}>
            Entrar
          </button>
        </form>
      </div>
    );
  }

  // --------- RENDER APP ---------
  return (
    <div style={{
      maxWidth: 900,
      margin: "auto",
      fontFamily: "Arial, sans-serif",
      backgroundColor: "#121212",
      color: "#eee",
      minHeight: "100vh",
      padding: "20px 15px 50px"
    }}>
      <header style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <h1>Controle de Gastos</h1>
        <button
          onClick={handleLogout}
          style={{
            backgroundColor: "#e15759",
            border: "none",
            color: "white",
            borderRadius: 4,
            cursor: "pointer",
            padding: "6px 12px"
          }}
        >
          Sair
        </button>
      </header>

      {/* Menu */}
      <nav style={{ marginBottom: 20, textAlign: "center" }}>
        {["resumo", "entradas", "saidas"].map(p => (
          <button
            key={p}
            onClick={() => {
              setPagina(p);
              cancelarEdicao();
            }}
            style={{
              margin: "0 8px 12px",
              padding: "10px 18px",
              backgroundColor: pagina === p ? "#4e79a7" : "#333",
              color: pagina === p ? "white" : "#bbb",
              border: "none",
              borderRadius: 6,
              cursor: "pointer",
              minWidth: 90,
              fontWeight: "600",
              fontSize: 16,
              transition: "background-color 0.3s"
            }}
          >
            {p[0].toUpperCase() + p.slice(1)}
          </button>
        ))}
      </nav>

      {/* Página Resumo */}
      {pagina === "resumo" && (
        <div>
          <h2>Resumo - {mesFiltro} {anoFiltro}</h2>

          <div style={{ marginBottom: 20, display: "flex", flexWrap: "wrap", gap: 20, justifyContent: "center" }}>
            <label>
              Mês:{" "}
              <select
                value={mesFiltro}
                onChange={e => setMesFiltro(e.target.value)}
                style={{
                  backgroundColor: "#222",
                  color: "#eee",
                  padding: "6px 10px",
                  borderRadius: 6,
                  border: "none",
                  minWidth: 100,
                  fontSize: 16
                }}
              >
                {meses.map(m => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>
            </label>

            <label>
              Ano:{" "}
              <input
                type="number"
                value={anoFiltro}
                onChange={e => setAnoFiltro(Number(e.target.value))}
                style={{
                  backgroundColor: "#222",
                  color: "#eee",
                  padding: "6px 10px",
                  borderRadius: 6,
                  border: "none",
                  width: 100,
                  fontSize: 16,
                  textAlign: "center"
                }}
              />
            </label>
          </div>

          <div style={{ fontSize: 20, fontWeight: "bold", marginBottom: 20, textAlign: "center" }}>
            Saldo: <span style={{ color: calcularSaldo(mesFiltro, anoFiltro) >= 0 ? "#59a14f" : "#e15759" }}>
              R$ {calcularSaldo(mesFiltro, anoFiltro).toFixed(2)}
            </span>
          </div>

          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              justifyContent: "space-around",
              gap: 40,
              marginTop: 20,
              marginBottom: 40
            }}
          >
            <div style={{ width: 300, height: 300 }}>
              <h3 style={{ textAlign: "center" }}>Entradas</h3>
              <canvas ref={chartPizzaEntradas} />
            </div>
            <div style={{ width: 300, height: 300 }}>
              <h3 style={{ textAlign: "center" }}>Saídas</h3>
              <canvas ref={chartPizzaSaidas} />
            </div>
          </div>

          <div style={{ maxHeight: 300, overflowY: "auto" }}>
            <h3>Transações do mês</h3>
            <table style={{ width: "100%", borderCollapse: "collapse", color: "#eee" }}>
              <thead>
                <tr style={{ borderBottom: "2px solid #444" }}>
                  <th style={{ padding: 8, textAlign: "left" }}>Descrição</th>
                  <th style={{ padding: 8 }}>Valor</th>
                  <th style={{ padding: 8 }}>Categoria</th>
                  <th style={{ padding: 8 }}>Tipo</th>
                  <th style={{ padding: 8 }}>Ações</th>
                </tr>
              </thead>
              <tbody>
                {transacoes
                  .filter(t => t.mes === mesFiltro && t.ano === anoFiltro)
                  .map(t => (
                    <tr key={t.id} style={{ borderBottom: "1px solid #333" }}>
                      <td style={{ padding: 6 }}>{t.descricao}</td>
                      <td style={{ padding: 6, textAlign: "right" }}>R$ {t.valor.toFixed(2)}</td>
                      <td style={{ padding: 6, textAlign: "center" }}>{t.categoria}</td>
                      <td style={{ padding: 6, textAlign: "center" }}>{t.tipo}</td>
                      <td style={{ padding: 6, textAlign: "center" }}>
                        <button
                          onClick={() => iniciarEdicao(t)}
                          style={{
                            marginRight: 6,
                            backgroundColor: "#4e79a7",
                            color: "white",
                            border: "none",
                            borderRadius: 4,
                            padding: "4px 8px",
                            cursor: "pointer"
                          }}
                        >
                          Editar
                        </button>
                        <button
                          onClick={() => excluirTransacao(t.id)}
                          style={{
                            backgroundColor: "#e15759",
                            color: "white",
                            border: "none",
                            borderRadius: 4,
                            padding: "4px 8px",
                            cursor: "pointer"
                          }}
                        >
                          Excluir
                        </button>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>

          {/* Editar transação */}
          {editando && (
            <div style={{
              marginTop: 30,
              backgroundColor: "#1e1e1e",
              padding: 20,
              borderRadius: 8,
              maxWidth: 500,
              marginLeft: "auto",
              marginRight: "auto"
            }}>
              <h3>Editar Transação</h3>
              <div style={{ marginBottom: 10 }}>
                <label>Descrição</label><br />
                <input
                  type="text"
                  value={editDados.descricao}
                  onChange={e => setEditDados({ ...editDados, descricao: e.target.value })}
                  style={{
                    width: "100%",
                    padding: 8,
                    borderRadius: 4,
                    border: "1px solid #333",
                    backgroundColor: "#222",
                    color: "#eee"
                  }}
                />
              </div>
              <div style={{ marginBottom: 10 }}>
                <label>Valor</label><br />
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={editDados.valor}
                  onChange={e => setEditDados({ ...editDados, valor: e.target.value })}
                  style={{
                    width: "100%",
                    padding: 8,
                    borderRadius: 4,
                    border: "1px solid #333",
                    backgroundColor: "#222",
                    color: "#eee"
                  }}
                />
              </div>
              <div style={{ marginBottom: 10 }}>
                <label>Categoria</label><br />
                <select
                  value={editDados.categoria}
                  onChange={e => setEditDados({ ...editDados, categoria: e.target.value })}
                  style={{
                    width: "100%",
                    padding: 8,
                    borderRadius: 4,
                    border: "1px solid #333",
                    backgroundColor: "#222",
                    color: "#eee"
                  }}
                >
                  {categorias.map(c => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>
              <div style={{ marginBottom: 10 }}>
                <label>Mês</label><br />
                <select
                  value={editDados.mes}
                  onChange={e => setEditDados({ ...editDados, mes: e.target.value })}
                  style={{
                    width: "100%",
                    padding: 8,
                    borderRadius: 4,
                    border: "1px solid #333",
                    backgroundColor: "#222",
                    color: "#eee"
                  }}
                >
                  {meses.map(m => (
                    <option key={m} value={m}>{m}</option>
                  ))}
                </select>
              </div>
              <div style={{ marginBottom: 10 }}>
                <label>Ano</label><br />
                <input
                  type="number"
                  value={editDados.ano}
                  onChange={e => setEditDados({ ...editDados, ano: e.target.value })}
                  style={{
                    width: "100%",
                    padding: 8,
                    borderRadius: 4,
                    border: "1px solid #333",
                    backgroundColor: "#222",
                    color: "#eee"
                  }}
                />
              </div>
              <div style={{ marginBottom: 10 }}>
                <label>Tipo</label><br />
                <select
                  value={editDados.tipo}
                  onChange={e => setEditDados({ ...editDados, tipo: e.target.value })}
                  style={{
                    width: "100%",
                    padding: 8,
                    borderRadius: 4,
                    border: "1px solid #333",
                    backgroundColor: "#222",
                    color: "#eee"
                  }}
                >
                  <option value="entrada">Entrada</option>
                  <option value="saida">Saída</option>
                </select>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <button
                  onClick={cancelarEdicao}
                  style={{
                    backgroundColor: "#999",
                    border: "none",
                    padding: "8px 12px",
                    borderRadius: 4,
                    cursor: "pointer",
                    color: "#222",
                    fontWeight: "bold"
                  }}
                >
                  Cancelar
                </button>
                <button
                  onClick={salvarEdicao}
                  style={{
                    backgroundColor: "#4e79a7",
                    border: "none",
                    padding: "8px 12px",
                    borderRadius: 4,
                    cursor: "pointer",
                    color: "white",
                    fontWeight: "bold"
                  }}
                >
                  Salvar
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Página Entradas */}
      {pagina === "entradas" && (
        <div>
          <h2>Adicionar Entrada</h2>
          <form onSubmit={adicionarEntrada} style={{ maxWidth: 400, margin: "auto" }}>
            <div style={{ marginBottom: 12 }}>
              <label>Descrição</label><br />
              <input
                type="text"
                value={descricaoEnt}
                onChange={e => setDescricaoEnt(e.target.value)}
                required
                style={{
                  width: "100%",
                  padding: 8,
                  borderRadius: 4,
                  border: "1px solid #333",
                  backgroundColor: "#222",
                  color: "#eee"
                }}
                autoFocus
              />
            </div>
            <div style={{ marginBottom: 12 }}>
              <label>Valor</label><br />
              <input
                type="number"
                min="0"
                step="0.01"
                value={valorEnt}
                onChange={e => setValorEnt(e.target.value)}
                required
                style={{
                  width: "100%",
                  padding: 8,
                  borderRadius: 4,
                  border: "1px solid #333",
                  backgroundColor: "#222",
                  color: "#eee"
                }}
              />
            </div>
            <div style={{ marginBottom: 12 }}>
              <label>Categoria</label><br />
              <select
                value={categoriaEnt}
                onChange={e => setCategoriaEnt(e.target.value)}
                required
                style={{
                  width: "100%",
                  padding: 8,
                  borderRadius: 4,
                  border: "1px solid #333",
                  backgroundColor: "#222",
                  color: "#eee"
                }}
              >
                {categorias.map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
            <div style={{ marginBottom: 12 }}>
              <label>Mês</label><br />
              <select
                value={mesEnt}
                onChange={e => setMesEnt(e.target.value)}
                required
                style={{
                  width: "100%",
                  padding: 8,
                  borderRadius: 4,
                  border: "1px solid #333",
                  backgroundColor: "#222",
                  color: "#eee"
                }}
              >
                {meses.map(m => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>
            </div>
            <div style={{ marginBottom: 12 }}>
              <label>
                <input
                  type="checkbox"
                  checked={recorrenteEnt}
                  onChange={e => setRecorrenteEnt(e.target.checked)}
                  style={{ marginRight: 8 }}
                />
                Recorrente (cria 12 meses)
              </label>
            </div>
            <div style={{ marginBottom: 12, display: "flex", gap: 8 }}>
              <input
                type="text"
                placeholder="Nova categoria"
                value={novaCatEnt}
                onChange={e => setNovaCatEnt(e.target.value)}
                style={{
                  flexGrow: 1,
                  padding: 8,
                  borderRadius: 4,
                  border: "1px solid #333",
                  backgroundColor: "#222",
                  color: "#eee"
                }}
              />
              <button
                type="button"
                onClick={() => adicionarCategoria(novaCatEnt, setNovaCatEnt, setCategoriaEnt)}
                style={{
                  backgroundColor: "#59a14f",
                  border: "none",
                  color: "white",
                  borderRadius: 4,
                  cursor: "pointer",
                  padding: "0 12px"
                }}
              >
                +
              </button>
            </div>
            <button
              type="submit"
              style={{
                width: "100%",
                padding: 12,
                backgroundColor: "#4e79a7",
                border: "none",
                borderRadius: 4,
                color: "#fff",
                fontWeight: "bold",
                cursor: "pointer"
              }}
            >
              Adicionar Entrada
            </button>
          </form>
        </div>
      )}

      {/* Página Saídas */}
      {pagina === "saidas" && (
        <div>
          <h2>Adicionar Saída</h2>
          <form onSubmit={adicionarSaida} style={{ maxWidth: 400, margin: "auto" }}>
            <div style={{ marginBottom: 12 }}>
              <label>Descrição</label><br />
              <input
                type="text"
                value={descricaoSai}
                onChange={e => setDescricaoSai(e.target.value)}
                required
                style={{
                  width: "100%",
                  padding: 8,
                  borderRadius: 4,
                  border: "1px solid #333",
                  backgroundColor: "#222",
                  color: "#eee"
                }}
                autoFocus
              />
            </div>
            <div style={{ marginBottom: 12 }}>
              <label>Valor</label><br />
              <input
                type="number"
                min="0"
                step="0.01"
                value={valorSai}
                onChange={e => setValorSai(e.target.value)}
                required
                style={{
                  width: "100%",
                  padding: 8,
                  borderRadius: 4,
                  border: "1px solid #333",
                  backgroundColor: "#222",
                  color: "#eee"
                }}
              />
            </div>
            <div style={{ marginBottom: 12 }}>
              <label>Categoria</label><br />
              <select
                value={categoriaSai}
                onChange={e => setCategoriaSai(e.target.value)}
                required
                style={{
                  width: "100%",
                  padding: 8,
                  borderRadius: 4,
                  border: "1px solid #333",
                  backgroundColor: "#222",
                  color: "#eee"
                }}
              >
                {categorias.map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
            <div style={{ marginBottom: 12 }}>
              <label>Mês</label><br />
              <select
                value={mesSai}
                onChange={e => setMesSai(e.target.value)}
                required
                style={{
                  width: "100%",
                  padding: 8,
                  borderRadius: 4,
                  border: "1px solid #333",
                  backgroundColor: "#222",
                  color: "#eee"
                }}
              >
                {meses.map(m => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>
            </div>
            <div style={{ marginBottom: 12 }}>
              <label>Parcelas</label><br />
              <input
                type="number"
                min="1"
                step="1"
                value={parcelasSai}
                onChange={e => setParcelasSai(e.target.value)}
                required
                style={{
                  width: "100%",
                  padding: 8,
                  borderRadius: 4,
                  border: "1px solid #333",
                  backgroundColor: "#222",
                  color: "#eee"
                }}
              />
            </div>
            <div style={{ marginBottom: 12, display: "flex", gap: 8 }}>
              <input
                type="text"
                placeholder="Nova categoria"
                value={novaCatSai}
                onChange={e => setNovaCatSai(e.target.value)}
                style={{
                  flexGrow: 1,
                  padding: 8,
                  borderRadius: 4,
                  border: "1px solid #333",
                  backgroundColor: "#222",
                  color: "#eee"
                }}
              />
              <button
                type="button"
                onClick={() => adicionarCategoria(novaCatSai, setNovaCatSai, setCategoriaSai)}
                style={{
                  backgroundColor: "#59a14f",
                  border: "none",
                  color: "white",
                  borderRadius: 4,
                  cursor: "pointer",
                  padding: "0 12px"
                }}
              >
                +
              </button>
            </div>
            <button
              type="submit"
              style={{
                width: "100%",
                padding: 12,
                backgroundColor: "#4e79a7",
                border: "none",
                borderRadius: 4,
                color: "#fff",
                fontWeight: "bold",
                cursor: "pointer"
              }}
            >
              Adicionar Saída
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
