import React, { useState, useEffect, useRef } from "react";
import Chart from "chart.js/auto";

const meses = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];

const coresCategoria = [
  "#4e79a7", "#f28e2b", "#e15759", "#76b7b2", "#59a14f",
  "#edc949", "#af7aa1", "#ff9da7", "#9c755f", "#bab0ab"
];

export default function App() {
  const [pagina, setPagina] = useState("resumo");
  const [transacoes, setTransacoes] = useState(() => {
    const saved = localStorage.getItem("transacoes");
    return saved ? JSON.parse(saved) : [];
  });

  const [categorias, setCategorias] = useState(() => {
    const saved = localStorage.getItem("categorias");
    return saved ? JSON.parse(saved) : ["Salário", "Alimentação", "Transporte", "Lazer", "Saúde", "Educação"];
  });

  const [descricaoEnt, setDescricaoEnt] = useState("");
  const [valorEnt, setValorEnt] = useState("");
  const [categoriaEnt, setCategoriaEnt] = useState(categorias[0] || "");
  const [mesEnt, setMesEnt] = useState(meses[new Date().getMonth()]);
  const [recorrenteEnt, setRecorrenteEnt] = useState(false);

  const [descricaoSai, setDescricaoSai] = useState("");
  const [valorSai, setValorSai] = useState("");
  const [categoriaSai, setCategoriaSai] = useState(categorias[0] || "");
  const [mesSai, setMesSai] = useState(meses[new Date().getMonth()]);
  const [parcelasSai, setParcelasSai] = useState(1);

  const [mesFiltro, setMesFiltro] = useState(meses[new Date().getMonth()]);
  const [anoFiltro, setAnoFiltro] = useState(new Date().getFullYear());

  const chartPizzaEntradas = useRef(null);
  const chartPizzaSaidas = useRef(null);
  const pizzaEntradasInst = useRef(null);
  const pizzaSaidasInst = useRef(null);

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
  }, [pagina, transacoes, mesFiltro, anoFiltro]);

  const atualizarGraficosResumo = () => {
    if (!chartPizzaEntradas.current || !chartPizzaSaidas.current) return;

    const transFiltradas = transacoes.filter((t) => t.mes === mesFiltro && t.ano === anoFiltro);

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

  const calcularSaldo = (mesAtual, anoAtual) => {
    const entradas = transacoes
      .filter((t) => t.mes === mesAtual && t.ano === anoAtual && t.tipo === "entrada")
      .reduce((acc, cur) => acc + cur.valor, 0);
    const saidas = transacoes
      .filter((t) => t.mes === mesAtual && t.ano === anoAtual && t.tipo === "saida")
      .reduce((acc, cur) => acc + cur.valor, 0);
    return entradas - saidas;
  };

  const adicionarEntrada = (e) => {
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
          ano: ano,
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
        ano: new Date().getFullYear(),
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

  // A mesma lógica deve ser aplicada para parcelas de saída
  // Inclua ano, ajuste mês + ano conforme necessário

  return (<div>Seu App aqui</div>);
}
