 SELECT 
                t1.col1,
                t2.col2
            FROM table1 t1
            RIGHT JOIN table2 t2 ON t1.id = t2.ref_id
            WHERE t1.status = 'active'