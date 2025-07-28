import React, { useState, useEffect, useRef } from "react";
import Chart from "chart.js/auto";

const meses = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];

const coresCategoria = [
  "#4e79a7",
  "#f28e2b",
  "#e15759",
  "#76b7b2",
  "#59a14f",
  "#edc949",
  "#af7aa1",
  "#ff9da7",
  "#9c755f",
  "#bab0ab",
];

export default function App() {
  const [pagina, setPagina] = useState("resumo");
  const [transacoes, setTransacoes] = useState(() => {
    const saved = localStorage.getItem("transacoes");
    return saved ? JSON.parse(saved) : [];
  });

  // Categorias pré-definidas (carregadas e salvas localStorage)
  const [categorias, setCategorias] = useState(() => {
    const saved = localStorage.getItem("categorias");
    return saved ? JSON.parse(saved) : ["Salário", "Alimentação", "Transporte", "Lazer", "Saúde", "Educação"];
  });

  // Estados formulário entradas
  const [descricaoEnt, setDescricaoEnt] = useState("");
  const [valorEnt, setValorEnt] = useState("");
  const [categoriaEnt, setCategoriaEnt] = useState(categorias[0] || "");
  const [mesEnt, setMesEnt] = useState(meses[new Date().getMonth()]);
  const [recorrenteEnt, setRecorrenteEnt] = useState(false);

  // Estados formulário saídas
  const [descricaoSai, setDescricaoSai] = useState("");
  const [valorSai, setValorSai] = useState("");
  const [categoriaSai, setCategoriaSai] = useState(categorias[0] || "");
  const [mesSai, setMesSai] = useState(meses[new Date().getMonth()]);
  const [parcelasSai, setParcelasSai] = useState(1);

  // Resumo filtro mês
  const [mesFiltro, setMesFiltro] = useState(meses[new Date().getMonth()]);

  // Edição
  const [mesEditar, setMesEditar] = useState(meses[new Date().getMonth()]);
  const [editandoId, setEditandoId] = useState(null);
  const [edicaoTemp, setEdicaoTemp] = useState({ descricao: "", valor: "", categoria: "" });

  // Controle para mostrar input novo categoria na edição
  const [showNovaCategoriaInput, setShowNovaCategoriaInput] = useState(false);
  const [novaCategoria, setNovaCategoria] = useState("");

  const chartPizzaEntradas = useRef(null);
  const chartPizzaSaidas = useRef(null);
  const pizzaEntradasInst = useRef(null);
  const pizzaSaidasInst = useRef(null);

  // Sincroniza localStorage categorias e transacoes
  useEffect(() => {
    localStorage.setItem("transacoes", JSON.stringify(transacoes));
  }, [transacoes]);

  useEffect(() => {
    localStorage.setItem("categorias", JSON.stringify(categorias));
  }, [categorias]);

  useEffect(() => {
    if (pagina === "resumo" && chartPizzaEntradas.current && chartPizzaSaidas.current) {
      atualizarGraficosResumo();
    }
  }, [pagina, transacoes, mesFiltro]);

  // Atualiza os gráficos de resumo
  const atualizarGraficosResumo = () => {
    if (!chartPizzaEntradas.current || !chartPizzaSaidas.current) return;

    const transFiltradas = transacoes.filter((t) => t.mes === mesFiltro);

    const somaPorCategoriaEntrada = {};
    const somaPorCategoriaSaida = {};

    transFiltradas.forEach((t) => {
      if (t.tipo === "entrada") {
        somaPorCategoriaEntrada[t.categoria] = (somaPorCategoriaEntrada[t.categoria] || 0) + t.valor;
      } else {
        somaPorCategoriaSaida[t.categoria] = (somaPorCategoriaSaida[t.categoria] || 0) + t.valor;
      }
    });

    const criarPizza = (ctx, dados, instanciaRef) => {
      if (instanciaRef.current) instanciaRef.current.destroy();
      if (Object.keys(dados).length === 0) {
        instanciaRef.current = new Chart(ctx, {
          type: "pie",
          data: {
            labels: ["Sem dados"],
            datasets: [{ data: [1], backgroundColor: ["#ccc"] }],
          },
          options: { plugins: { legend: { position: "bottom" } } },
        });
        return;
      }
      const labels = Object.keys(dados);
      const bgColors = labels.map((_, i) => coresCategoria[i % coresCategoria.length]);

      instanciaRef.current = new Chart(ctx, {
        type: "pie",
        data: {
          labels,
          datasets: [{ data: Object.values(dados).map((v) => +v.toFixed(2)), backgroundColor: bgColors }],
        },
        options: {
          plugins: { legend: { position: "bottom" } },
          responsive: true,
        },
      });
    };

    criarPizza(chartPizzaEntradas.current.getContext("2d"), somaPorCategoriaEntrada, pizzaEntradasInst);
    criarPizza(chartPizzaSaidas.current.getContext("2d"), somaPorCategoriaSaida, pizzaSaidasInst);
  };

  // Cálculo saldo mês
  const calcularSaldo = (mesAtual) => {
    const entradas = transacoes
      .filter((t) => t.mes === mesAtual && t.tipo === "entrada")
      .reduce((acc, cur) => acc + cur.valor, 0);
    const saidas = transacoes
      .filter((t) => t.mes === mesAtual && t.tipo === "saida")
      .reduce((acc, cur) => acc + cur.valor, 0);
    return entradas - saidas;
  };

  // Ações adicionar entrada e saída
  const adicionarEntrada = (e) => {
    e.preventDefault();
    const valNum = parseFloat(valorEnt);
    if (!descricaoEnt || !categoriaEnt || isNaN(valNum) || valNum <= 0) {
      alert("Preencha os campos corretamente na entrada!");
      return;
    }
    const novas = [...transacoes];
    if (recorrenteEnt) {
      for (let i = 0; i < 12; i++) {
        const mesIndex = (meses.indexOf(mesEnt) + i) % 12;
        novas.push({
          descricao: descricaoEnt + " (recorrente)",
          valor: valNum,
          categoria: categoriaEnt,
          mes: meses[mesIndex],
          tipo: "entrada",
          id: Date.now() + i,
        });
      }
    } else {
      novas.push({
        descricao: descricaoEnt,
        valor: valNum,
        categoria: categoriaEnt,
        mes: mesEnt,
        tipo: "entrada",
        id: Date.now(),
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

  const adicionarSaida = (e) => {
    e.preventDefault();
    const valNum = parseFloat(valorSai);
    if (!descricaoSai || !categoriaSai || isNaN(valNum) || valNum <= 0 || parcelasSai < 1) {
      alert("Preencha os campos corretamente na saída!");
      return;
    }
    const novas = [...transacoes];
    const valorParcela = valNum / parcelasSai;
    for (let i = 0; i < parcelasSai; i++) {
      const mesIndex = (meses.indexOf(mesSai) + i) % 12;
      novas.push({
        descricao: descricaoSai + ` (parcela ${i + 1}/${parcelasSai})`,
        valor: valorParcela,
        categoria: categoriaSai,
        mes: meses[mesIndex],
        tipo: "saida",
        id: Date.now() + i,
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

  // Editar lançamentos
  const iniciarEdicao = (transacao) => {
    setEditandoId(transacao.id);
    setEdicaoTemp({
      descricao: transacao.descricao,
      valor: transacao.valor.toFixed(2),
      categoria: transacao.categoria,
    });
    setShowNovaCategoriaInput(false);
    setNovaCategoria("");
  };
  const cancelarEdicao = () => {
    setEditandoId(null);
    setEdicaoTemp({ descricao: "", valor: "", categoria: "" });
    setShowNovaCategoriaInput(false);
    setNovaCategoria("");
  };
  const salvarEdicao = () => {
    const valNum = parseFloat(edicaoTemp.valor);
    if (!edicaoTemp.descricao || !edicaoTemp.categoria || isNaN(valNum) || valNum <= 0) {
      alert("Preencha os campos corretamente na edição!");
      return;
    }
    setTransacoes((atual) =>
      atual.map((t) =>
        t.id === editandoId
          ? { ...t, descricao: edicaoTemp.descricao, valor: valNum, categoria: edicaoTemp.categoria }
          : t
      )
    );
    cancelarEdicao();
  };
  const deletarTransacao = (id) => {
  const transacaoAlvo = transacoes.find((t) => t.id === id);
  if (!transacaoAlvo) return;

  const descricaoBase = transacaoAlvo.descricao.split(" (parcela")[0];
  const transacoesRelacionadas = transacoes.filter(
    (t) =>
      t.id === id || t.descricao.startsWith(descricaoBase + " (parcela")
  );

  if (transacoesRelacionadas.length > 1) {
    const confirmarTodas = window.confirm(
      `Deseja excluir todas as parcelas de "${descricaoBase}"?`
    );
    if (confirmarTodas) {
      setTransacoes((atual) =>
        atual.filter((t) => !t.descricao.startsWith(descricaoBase + " (parcela"))
      );
      return;
    }
  }

  const confirmarUma = window.confirm("Deseja realmente apagar esta transação?");
  if (confirmarUma) {
    setTransacoes((atual) => atual.filter((t) => t.id !== id));
    if (editandoId === id) cancelarEdicao();
  }
};

  // Adicionar nova categoria na edição
  const adicionarNovaCategoria = () => {
    const catTrim = novaCategoria.trim();
    if (!catTrim) return alert("Informe um nome válido para a nova categoria.");
    if (categorias.includes(catTrim)) return alert("Categoria já existe.");
    const novasCats = [...categorias, catTrim];
    setCategorias(novasCats);
    setEdicaoTemp((old) => ({ ...old, categoria: catTrim }));
    setNovaCategoria("");
    setShowNovaCategoriaInput(false);
  };

  // Estilos - mantém iguais ao código anterior para brevidade
  const style = {
    container: {
      maxWidth: 480,
      margin: "0 auto",
      padding: "10px 15px 60px",
      fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif",
      backgroundColor: "#f7f9fc",
      minHeight: "100vh",
      display: "flex",
      flexDirection: "column",
    },
    header: {
      padding: "15px 0",
      textAlign: "center",
      fontWeight: "700",
      fontSize: 24,
      color: "#333",
      borderBottom: "1px solid #ddd",
      marginBottom: 15,
      userSelect: "none",
    },
    nav: {
      display: "flex",
      justifyContent: "space-between",
      marginBottom: 20,
      flexWrap: "wrap",
      gap: 8,
    },
    navButton: (active) => ({
      flex: "1 1 22%",
      padding: "10px 0",
      borderRadius: 8,
      border: "none",
      fontWeight: "600",
      cursor: active ? "default" : "pointer",
      backgroundColor: active ? "#3f51b5" : "#e0e0e0",
      color: active ? "white" : "#333",
      boxShadow: active ? "0 4px 8px rgba(63,81,181,0.3)" : "none",
      transition: "background-color 0.3s",
    }),
    formGroup: { marginBottom: 15, display: "flex", flexDirection: "column" },
    label: { marginBottom: 6, fontWeight: "600", color: "#555" },
    input: {
      padding: 10,
      borderRadius: 6,
      border: "1.5px solid #ccc",
      fontSize: 16,
      outlineColor: "#3f51b5",
      transition: "border-color 0.3s",
    },
    inputFocus: { borderColor: "#3f51b5" },
    checkboxLabel: { display: "flex", alignItems: "center", gap: 8, fontWeight: "600", cursor: "pointer" },
    buttonPrimary: {
      backgroundColor: "#3f51b5",
      color: "white",
      padding: "12px 20px",
      borderRadius: 8,
      border: "none",
      fontWeight: "700",
      cursor: "pointer",
      width: "100%",
      marginTop: 10,
      boxShadow: "0 4px 8px rgba(63,81,181,0.3)",
      transition: "background-color 0.3s",
    },
    buttonPrimaryHover: { backgroundColor: "#2c387e" },
    sectionTitle: { marginBottom: 12, color: "#222", fontWeight: "700", fontSize: 20 },
    resumoContainer: { display: "flex", flexDirection: "column", gap: 25 },
    graficosContainer: {
      display: "flex",
      gap: 20,
      flexWrap: "wrap",
      justifyContent: "center",
    },
    graficoBox: {
      flex: "1 1 45%",
      backgroundColor: "white",
      borderRadius: 12,
      padding: 15,
      boxShadow: "0 3px 10px rgba(0,0,0,0.1)",
      minWidth: 280,
    },
    saldoBox: {
      backgroundColor: "white",
      borderRadius: 12,
      padding: 20,
      boxShadow: "0 3px 10px rgba(0,0,0,0.1)",
      textAlign: "center",
      fontSize: 18,
      fontWeight: "700",
      color: calcularSaldo(mesFiltro) >= 0 ? "#2e7d32" : "#c62828",
    },
    tableContainer: {
      overflowX: "auto",
      marginTop: 20,
      borderRadius: 10,
      boxShadow: "0 3px 10px rgba(0,0,0,0.1)",
      backgroundColor: "white",
    },
    table: {
      width: "100%",
      borderCollapse: "collapse",
      minWidth: 400,
    },
    th: {
      textAlign: "left",
      borderBottom: "2px solid #ddd",
      padding: 12,
      fontWeight: "700",
      backgroundColor: "#f0f0f0",
      color: "#333",
    },
    td: {
      padding: 12,
      borderBottom: "1px solid #eee",
      verticalAlign: "middle",
    },
    buttonSmall: {
      backgroundColor: "#3f51b5",
      color: "white",
      border: "none",
      borderRadius: 6,
      padding: "6px 10px",
      cursor: "pointer",
      marginRight: 6,
      fontWeight: "600",
      transition: "background-color 0.3s",
    },
    buttonSmallDanger: {
      backgroundColor: "#c62828",
      color: "white",
      border: "none",
      borderRadius: 6,
      padding: "6px 10px",
      cursor: "pointer",
      fontWeight: "600",
      transition: "background-color 0.3s",
    },
    footerNav: {
      position: "fixed",
      bottom: 0,
      left: 0,
      width: "100%",
      backgroundColor: "#fff",
      borderTop: "1px solid #ddd",
      display: "flex",
      justifyContent: "space-around",
      padding: "8px 0",
      boxShadow: "0 -2px 8px rgba(0,0,0,0.1)",
      zIndex: 10,
    },
    footerButton: (active) => ({
      flex: 1,
      textAlign: "center",
      padding: "10px 0",
      fontWeight: active ? "700" : "500",
      color: active ? "#3f51b5" : "#888",
      borderBottom: active ? "3px solid #3f51b5" : "3px solid transparent",
      cursor: "pointer",
      fontSize: 14,
      userSelect: "none",
      transition: "color 0.3s, border-bottom 0.3s",
    }),
    novaCatContainer: {
      marginTop: 10,
      display: "flex",
      gap: 8,
      alignItems: "center",
    },
    novaCatInput: {
      flex: 1,
      padding: 8,
      borderRadius: 6,
      border: "1.5px solid #ccc",
      fontSize: 16,
    },
    novaCatButton: {
      padding: "8px 14px",
      borderRadius: 6,
      border: "none",
      backgroundColor: "#4caf50",
      color: "white",
      fontWeight: "700",
      cursor: "pointer",
      transition: "background-color 0.3s",
    },
  };

  // Detecta tela pequena para usar footer nav ou nav normal
  const [mobile, setMobile] = useState(window.innerWidth < 600);
  useEffect(() => {
    const handleResize = () => setMobile(window.innerWidth < 600);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  return (
    <div style={style.container}>
      <header style={style.header}>Controle Financeiro</header>

      {!mobile && (
        <nav style={style.nav} role="navigation" aria-label="Menu principal">
          <button onClick={() => setPagina("resumo")} style={style.navButton(pagina === "resumo")} aria-current={pagina === "resumo"}>
            Resumo
          </button>
          <button onClick={() => setPagina("entrada")} style={style.navButton(pagina === "entrada")} aria-current={pagina === "entrada"}>
            Entradas
          </button>
          <button onClick={() => setPagina("saida")} style={style.navButton(pagina === "saida")} aria-current={pagina === "saida"}>
            Saídas
          </button>
          <button onClick={() => setPagina("editar")} style={style.navButton(pagina === "editar")} aria-current={pagina === "editar"}>
            Editar
          </button>
        </nav>
      )}

      {mobile && (
        <nav style={style.footerNav} role="navigation" aria-label="Menu principal">
          <button onClick={() => setPagina("resumo")} style={style.footerButton(pagina === "resumo")} aria-current={pagina === "resumo"}>
            Resumo
          </button>
          <button onClick={() => setPagina("entrada")} style={style.footerButton(pagina === "entrada")} aria-current={pagina === "entrada"}>
            Entradas
          </button>
          <button onClick={() => setPagina("saida")} style={style.footerButton(pagina === "saida")} aria-current={pagina === "saida"}>
            Saídas
          </button>
          <button onClick={() => setPagina("editar")} style={style.footerButton(pagina === "editar")} aria-current={pagina === "editar"}>
            Editar
          </button>
        </nav>
      )}

      {pagina === "resumo" && (
        <section aria-label="Resumo financeiro" style={style.resumoContainer}>
          <label htmlFor="mesFiltro" style={style.label}>
            Filtrar por mês:
            <select
              id="mesFiltro"
              value={mesFiltro}
              onChange={(e) => setMesFiltro(e.target.value)}
              style={{ ...style.input, maxWidth: 150 }}
            >
              {meses.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
          </label>

          <div style={style.graficosContainer}>
            <div style={style.graficoBox}>
              <h3 style={{ textAlign: "center" }}>Entradas por Categoria</h3>
              <canvas ref={chartPizzaEntradas} aria-label="Gráfico de pizza entradas" />
            </div>
            <div style={style.graficoBox}>
              <h3 style={{ textAlign: "center" }}>Saídas por Categoria</h3>
              <canvas ref={chartPizzaSaidas} aria-label="Gráfico de pizza saídas" />
            </div>
          </div>

          <div style={style.saldoBox} aria-live="polite">
            Saldo {mesFiltro}:{" "}
            <span>{calcularSaldo(mesFiltro).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</span>
            <br />
            Saldo {meses[(meses.indexOf(mesFiltro) + 1) % 12]}:{" "}
            <span
              style={{
                color: calcularSaldo(meses[(meses.indexOf(mesFiltro) + 1) % 12]) >= 0 ? "#2e7d32" : "#c62828",
                fontWeight: "700",
              }}
            >
              {calcularSaldo(meses[(meses.indexOf(mesFiltro) + 1) % 12]).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
            </span>
          </div>
        </section>
      )}

      {pagina === "entrada" && (
        <form onSubmit={adicionarEntrada} aria-label="Formulário de adicionar entrada">
          <h2 style={style.sectionTitle}>Adicionar Entrada</h2>
          <div style={style.formGroup}>
            <label style={style.label} htmlFor="descricaoEnt">
              Descrição
            </label>
            <input
              id="descricaoEnt"
              type="text"
              value={descricaoEnt}
              onChange={(e) => setDescricaoEnt(e.target.value)}
              style={style.input}
              required
            />
          </div>
          <div style={style.formGroup}>
            <label style={style.label} htmlFor="valorEnt">
              Valor (R$)
            </label>
            <input
              id="valorEnt"
              type="number"
              min="0.01"
              step="0.01"
              value={valorEnt}
              onChange={(e) => setValorEnt(e.target.value)}
              style={style.input}
              required
            />
          </div>
          <div style={style.formGroup}>
            <label style={style.label} htmlFor="categoriaEnt">
              Categoria
            </label>
            <select
              id="categoriaEnt"
              value={categoriaEnt}
              onChange={(e) => setCategoriaEnt(e.target.value)}
              style={style.input}
              required
            >
              {categorias.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>
          <div style={style.formGroup}>
            <label style={style.label} htmlFor="mesEnt">
              Mês
            </label>
            <select
              id="mesEnt"
              value={mesEnt}
              onChange={(e) => setMesEnt(e.target.value)}
              style={style.input}
              required
            >
              {meses.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
          </div>
          <label style={style.checkboxLabel}>
            <input
              type="checkbox"
              checked={recorrenteEnt}
              onChange={(e) => setRecorrenteEnt(e.target.checked)}
              aria-checked={recorrenteEnt}
            />
            Recorrente (ex: salário)
          </label>
          <button type="submit" style={style.buttonPrimary} aria-label="Salvar entrada">
            Salvar
          </button>
        </form>
      )}

      {pagina === "saida" && (
        <form onSubmit={adicionarSaida} aria-label="Formulário de adicionar saída">
          <h2 style={style.sectionTitle}>Adicionar Saída</h2>
          <div style={style.formGroup}>
            <label style={style.label} htmlFor="descricaoSai">
              Descrição
            </label>
            <input
              id="descricaoSai"
              type="text"
              value={descricaoSai}
              onChange={(e) => setDescricaoSai(e.target.value)}
              style={style.input}
              required
            />
          </div>
          <div style={style.formGroup}>
            <label style={style.label} htmlFor="valorSai">
              Valor (R$)
            </label>
            <input
              id="valorSai"
              type="number"
              min="0.01"
              step="0.01"
              value={valorSai}
              onChange={(e) => setValorSai(e.target.value)}
              style={style.input}
              required
            />
          </div>
          <div style={style.formGroup}>
            <label style={style.label} htmlFor="categoriaSai">
              Categoria
            </label>
            <select
              id="categoriaSai"
              value={categoriaSai}
              onChange={(e) => setCategoriaSai(e.target.value)}
              style={style.input}
              required
            >
              {categorias.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>
          <div style={style.formGroup}>
            <label style={style.label} htmlFor="mesSai">
              Mês
            </label>
            <select
              id="mesSai"
              value={mesSai}
              onChange={(e) => setMesSai(e.target.value)}
              style={style.input}
              required
            >
              {meses.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
          </div>
          <div style={style.formGroup}>
            <label style={style.label} htmlFor="parcelasSai">
              Número de Parcelas
            </label>
            <input
              id="parcelasSai"
              type="number"
              min="1"
              value={parcelasSai}
              onChange={(e) => setParcelasSai(Number(e.target.value))}
              style={style.input}
              required
            />
          </div>
          <button type="submit" style={style.buttonPrimary} aria-label="Salvar saída">
            Salvar
          </button>
        </form>
      )}

      {pagina === "editar" && (
        <>
          <h2 style={style.sectionTitle}>Editar Lançamentos - Mês: {mesEditar}</h2>

          <label htmlFor="mesEditar" style={style.label}>
            Selecione o mês:
            <select
              id="mesEditar"
              value={mesEditar}
              onChange={(e) => setMesEditar(e.target.value)}
              style={{ ...style.input, marginBottom: 15, maxWidth: 150 }}
            >
              {meses.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
          </label>

          <div style={style.tableContainer} role="region" aria-live="polite" aria-label="Lista de transações para edição">
            <table style={style.table}>
              <thead>
                <tr>
                  <th style={style.th}>Descrição</th>
                  <th style={style.th}>Valor (R$)</th>
                  <th style={style.th}>Categoria</th>
                  <th style={style.th}>Tipo</th>
                  <th style={style.th}>Ações</th>
                </tr>
              </thead>
              <tbody>
                {transacoes.filter((t) => t.mes === mesEditar).length === 0 && (
                  <tr>
                    <td colSpan={5} style={{ ...style.td, textAlign: "center", fontStyle: "italic" }}>
                      Nenhuma transação neste mês.
                    </td>
                  </tr>
                )}
                {transacoes
                  .filter((t) => t.mes === mesEditar)
                  .map((t) => (
                    <tr key={t.id}>
                      <td style={style.td}>
                        {editandoId === t.id ? (
                          <input
                            value={edicaoTemp.descricao}
                            onChange={(e) => setEdicaoTemp((old) => ({ ...old, descricao: e.target.value }))}
                            style={style.input}
                          />
                        ) : (
                          t.descricao
                        )}
                      </td>
                      <td style={style.td}>
                        {editandoId === t.id ? (
                          <input
                            type="number"
                            min="0.01"
                            step="0.01"
                            value={edicaoTemp.valor}
                            onChange={(e) => setEdicaoTemp((old) => ({ ...old, valor: e.target.value }))}
                            style={style.input}
                          />
                        ) : (
                          t.valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })
                        )}
                      </td>
                      <td style={style.td}>
                        {editandoId === t.id ? (
                          <>
                            <select
                              value={edicaoTemp.categoria}
                              onChange={(e) => setEdicaoTemp((old) => ({ ...old, categoria: e.target.value }))}
                              style={{ ...style.input, maxWidth: 150 }}
                            >
                              {categorias.map((cat) => (
                                <option key={cat} value={cat}>
                                  {cat}
                                </option>
                              ))}
                            </select>
                            {!showNovaCategoriaInput && (
                              <button
                                type="button"
                                onClick={() => setShowNovaCategoriaInput(true)}
                                style={{
                                  marginLeft: 8,
                                  padding: "4px 8px",
                                  fontSize: 14,
                                  cursor: "pointer",
                                }}
                                aria-label="Adicionar nova categoria"
                                title="Adicionar nova categoria"
                              >
                                +
                              </button>
                            )}
                            {showNovaCategoriaInput && (
                              <div style={style.novaCatContainer}>
                                <input
                                  type="text"
                                  placeholder="Nova categoria"
                                  value={novaCategoria}
                                  onChange={(e) => setNovaCategoria(e.target.value)}
                                  style={style.novaCatInput}
                                />
                                <button
                                  type="button"
                                  onClick={adicionarNovaCategoria}
                                  style={style.novaCatButton}
                                  aria-label="Salvar nova categoria"
                                >
                                  ✓
                                </button>
                              </div>
                            )}
                          </>
                        ) : (
                          t.categoria
                        )}
                      </td>
                      <td style={style.td}>{t.tipo}</td>
                      <td style={style.td}>
                        {editandoId === t.id ? (
                          <>
                            <button
                              onClick={salvarEdicao}
                              style={style.buttonSmall}
                              aria-label="Salvar edição"
                              title="Salvar"
                            >
                              💾
                            </button>
                            <button
                              onClick={cancelarEdicao}
                              style={style.buttonSmall}
                              aria-label="Cancelar edição"
                              title="Cancelar"
                            >
                              ❌
                            </button>
                          </>
                        ) : (
                          <>
                            <button
                              onClick={() => iniciarEdicao(t)}
                              style={style.buttonSmall}
                              aria-label="Editar transação"
                              title="Editar"
                            >
                              ✏️
                            </button>
                            <button
                              onClick={() => deletarTransacao(t.id)}
                              style={style.buttonSmallDanger}
                              aria-label="Excluir transação"
                              title="Excluir"
                            >
                              🗑️
                            </button>
                          </>
                        )}
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
