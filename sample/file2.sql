SELECT 
                file1.id, 
                file1.emp, 
                a.num, 
                b.id_num, 
                b.expo 
            FROM a 
            INNER JOIN b ON a.id_num = b.id_num
            LEFT JOIN file1 ON a.id = file1.id