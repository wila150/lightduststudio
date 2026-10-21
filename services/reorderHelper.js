// 共用：把「拖拉排序後的新順序」套用回一組 Firestore 文件。value pool 只從 orderedIds 這幾筆本身
// 原本的 sortOrder 取（由大到小重新分配給新順序），不是從全部文件取——這樣不管 orderedIds 是完整清單
// 還是畫面上篩選過的子集合（例如只顯示某個分類的項目），排序結果都不會動到沒被拖到的其他文件的相對位置
async function applyReorder(collectionRef, docs, orderedIds) {

    const byId = new Map(docs.map(doc => [doc.id, doc]));
    const targets = orderedIds.map(id => byId.get(id)).filter(Boolean);

    const values = targets
        .map(doc => (typeof doc.sortOrder === "number" ? doc.sortOrder : 0))
        .sort((a, b) => b - a);

    await Promise.all(targets.map((doc, index) =>
        collectionRef.doc(doc.id).update({ sortOrder: values[index] })
    ));

}

module.exports = { applyReorder };
