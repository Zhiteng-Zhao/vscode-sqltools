# SQLTools Memory Clear MM Driver

This package is part of [vscode-sqltools](https://vscode-sqltools.mteixeira.dev/?umd_source=repository&utm_medium=readme&utm_campaign=pg) extension.

## Changelog

### 0.1.0

- First working version

## Guides

> `"mt.defalt.cache"` could be replaced with constant `DATA_CACHE`

### Base Grammar

- list grammar

    ```java
    TableBuilder.createTable(
        dataManager.get("mt.default.cache", "ArbiContract0", Table.class)
    ).where(
        eq("arbiCode", "SP")
    ).list();
    ```

    ```java
    TableBuilder.createTable(
        dataManager.get("mt.default.cache", "ArbiContract0", Table.class)
    ).where(
        or(eq("arbiCode", "SPC"), eq("leg1", "bb2009"))
    ).list();
    ```

    ```java
    TableBuilder.createTable(
        dataManager.get("mt.default.cache", "ArbiContract0", Table.class)
    ).where(
        in("arbiCode", "SP,SPC")
    ).list();
    ```

    > `in("arbiCode", "SP,SPC")` values separated by commas

    ```java
    TableBuilder.createTable(
        dataManager.get("mt.default.cache", "FtrContract0", Table.class)
    ).where(
        exists(TableBuilder.createTable(
                dataManager.get("mt.default.cache", "OptContract0", Table.class)
              ), "seriesId=$contractId")
    ).list();
    ```

- group grammar

    ```java
    TableBuilder.createTable(
        dataManager.get("mt.default.cache", "ArbiContract0", Table.class)
    ).group(
        by("arbiCode"), sum("legToNum")
    ).list();
    ```

- order grammar

    ```java
    TableBuilder.createTable(
        dataManager.get("mt.default.cache", "ArbiContract0", Table.class)
    ).order(
        asc("arbiCode")
    ).list();
    ```

### Advanced Grammar

- get string value from cache

    ```java
    dataManager.getString("mt.default.cache", "CURRENT_TRADE_DATE");
    ```

- update grammar

    ```java
    TableBuilder.createTable(
        dataManager.get("mt.default.cache", "ArbiContract0", Table.class)
    ).where(
        eq("arbiCode", "SPC")
    ).update(
        val("arbiCode", "SP")
    ).idx("0");
    ```

    > `val()` [Required] set values

    > `.idx()` [Optional] start with 0, that is the index of data

- join grammar

    ```java
    TableBuilder.createTable(
        dataManager.get("mt.default.cache", "FtrContract0", Table.class), "a"
    ).innerJoin(
        dataManager.get("mt.default.cache", "OptContract0", Table.class), "b"
    ).on(
        eq("a.contractId", "b.seriesId")
    ).class("para.product.FtrContract").where(eq("varietyId", "m")).list();
    ```

    > `.class()` [Optional] is the package of result class, that could be defined without `com.dce.common.model` or use default value `RowX` when it is missing

### 0.1.1

- support distinct grammar 

    ```java
    TableBuilder.createTable(
        dataManager.get("mt.default.cache", "ArbiContract0", Table.class)
    ).where(
        unieq("seriesId", "b2")
    ).distinct("seriesId", "varietyId");
    ```

- add "Export All" button for grid to get the whole data 