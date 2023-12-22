const soap = require("soap");
const readline = require("readline");

const url = "https://www.cbr.ru/DailyInfoWebServ/DailyInfo.asmx?WSDL";

const rlInterface = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

const determineDayOfWeek = (dateString) => {
  const daysOfWeek = ["Monday", "Tuesday", "Wednesday", "Friday", "Thursday", "Friday", "Saturday"];
  const date = new Date(dateString);
  const dayIndex = date.getDay();
  return daysOfWeek[dayIndex];
};

const displayCurrencyData = (currencyData, date) => {
  if (currencyData && currencyData.length > 0) {
    console.log(`Данные по валютам на ${date} (${determineDayOfWeek(date)}):`);
    currencyData.forEach(valute => {
      const currencyCode = valute.VchCode || valute.Vcode;
      console.log(`валюта: ${valute.Vname}, Код: ${currencyCode}, Номинал: ${valute.Vnom}, Курс: ${valute.Vcurs} к руб`);
    });
  } else {
    console.log("Данные отсутствуют.");
  }
};

const fetchCursOnDateXML = (currentDate, currencyCodes) => {
  soap.createClient(url, (err, client) => {
    if (err) {
      console.error(err);
      return;
    }

    client.GetCursOnDateXML({ On_date: currentDate }, (err, result) => {
      if (err) {
        console.error(err);
        return;
      }

      const valuteCursOnDate = result.GetCursOnDateXMLResult.ValuteData.ValuteCursOnDate;

      if (currencyCodes && currencyCodes.length > 0) {
        const filteredCurrencyData = valuteCursOnDate.filter(valute => currencyCodes.includes(valute.VchCode));
        displayCurrencyData(filteredCurrencyData, currentDate);
      } else {
        displayCurrencyData(valuteCursOnDate, currentDate);
      }
    });
  });
};

const fetchCursDynamicXML = (params, fromDate, toDate, currencyCode) => {
  soap.createClient(url, (err, client) => {
    if (err) {
      console.error(err);
      return;
    }

    client.GetCursDynamicXML(params, (err, result) => {
      if (err) {
        console.error(err);
        return;
      }

      const valuteData = result.GetCursDynamicXMLResult.ValuteData;

      if (valuteData && valuteData.ValuteCursDynamic) {
        const valuteCursDynamic = valuteData.ValuteCursDynamic;

        if (Array.isArray(valuteCursDynamic)) {
          if (currencyCode) {
            const filteredCurrencyData = valuteCursDynamic.filter(valute => valute.Vcode === currencyCode);
            displayCurrencyData(filteredCurrencyData, fromDate);
          } else {
            displayCurrencyData(valuteCursDynamic, fromDate);
          }
        } else if (valuteCursDynamic) {
          displayCurrencyData([valuteCursDynamic], fromDate);
        } else {
          console.log("Данные отсутствуют.");
        }
      } else {
        console.log("Данные отсутствуют.");
      }
    });
  });
};

rlInterface.question("\nВыберите действие:\n\n1. получить данные по дате\n\n2. получить динамику волюты по датам\n\n", (choice) => {
  if (choice === "1") {
    rlInterface.question("\nВведите дату (ГГГГ-ММ-ДД): ", (currentDate) => {
      rlInterface.question("\nВведите код валюты или ее название: ", (input) => {
        const currencyCodesForOnDate = input.trim() ? input.trim().split(",") : [];
        fetchCursOnDateXML(currentDate, currencyCodesForOnDate);
        rlInterface.close();
      });
    });
  } else if (choice === "2") {
    rlInterface.question("\nВведите начальную дату (ГГГГ-ММ-ДД): ", (fromDate) => {
      rlInterface.question("\nВведите конечную дату (ГГГГ-ММ-ДД): ", (toDate) => {
        rlInterface.question("\nВведите код валюты: ", (currencyCodeForDynamic) => {
          const dynamicParams = {
            FromDate: `${fromDate}T10:30:00`,
            ToDate: `${toDate}T10:30:00`,
            ValutaCode: currencyCodeForDynamic.trim() || "R01239",
          };

          fetchCursDynamicXML(dynamicParams, fromDate, toDate, currencyCodeForDynamic.trim());
          rlInterface.close();
        });
      });
    });
  } else {
    console.log("Ошибка неверный выбор... Пожалуйста, введите 1 или 2.");
    rlInterface.close();
  }
});
